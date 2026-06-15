import { redirect } from 'next/navigation';
import { requireAuth } from '@crm/auth';
import { connectDB, Company } from '@crm/db';
import { listScheduleEntries, userNeedsEmployeeOnboarding } from '@crm/core';
import { Container } from '@crm/ui';
import { format } from 'date-fns';
import mongoose from 'mongoose';
import { HrRequest } from '@crm/db';
import { listEmployeeMemberships, resolveActiveEmployee } from '@/lib/hr/active-employee';
import { MyHrClient } from './_components/my-hr-client';
import { MyNoEmployee } from './_components/my-no-employee';
import type { CalendarEvent } from '../_components/hr-schedule-calendar';

const TYPE_LABELS: Record<string, string> = {
  holiday: 'Szabadság',
  sick_leave: 'Betegszabadság',
  schedule_change: 'Beosztás módosítás',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Függő',
  approved: 'Jóváhagyva',
  rejected: 'Elutasítva',
  cancelled: 'Visszavonva',
};

export default async function MyHrPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const user = await requireAuth();
  if (!user) return null;
  await connectDB();

  const userId = new mongoose.Types.ObjectId(user.id);
  const { employeeId: employeeIdParam } = await searchParams;

  const needsOnboarding = await userNeedsEmployeeOnboarding(userId);
  if (needsOnboarding) {
    redirect('/accounting/onboarding');
  }

  const memberships = await listEmployeeMemberships(userId);
  if (memberships.length === 0) {
    return <MyNoEmployee />;
  }

  const emp = await resolveActiveEmployee(userId, employeeIdParam);
  if (!emp) {
    return <MyNoEmployee />;
  }

  const companyIds = [...new Set(memberships.map((m) => m.companyId))];
  const companies = await Company.find({ _id: { $in: companyIds } })
    .select({ name: 1 })
    .lean()
    .exec();
  const companyMap = new Map(companies.map((c) => [c._id.toString(), c.name]));
  const companyName = companyMap.get(emp.companyId.toString()) ?? '—';

  const membershipOptions = memberships.map((m) => ({
    employeeId: m._id,
    label: `${m.name} — ${companyMap.get(m.companyId) ?? '—'}`,
  }));

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const [entries, requests] = await Promise.all([
    listScheduleEntries({
      start: rangeStart,
      end: rangeEnd,
      employeeId: emp._id,
      allowedCompanyIds: null,
    }),
    HrRequest.find({ employeeId: emp._id }).sort({ createdAt: -1 }).limit(20).lean().exec(),
  ]);

  const initialEvents: CalendarEvent[] = entries.map((e) => ({
    id: e._id.toString(),
    title: e.title ?? (e.kind === 'shift' ? 'Műszak' : e.kind),
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    kind: e.kind,
  }));

  const requestRows = requests.map((r) => {
    const start = r.payload?.startDate ?? r.payload?.proposedStart;
    const end = r.payload?.endDate ?? r.payload?.proposedEnd;
    return {
      _id: String(r._id),
      type: TYPE_LABELS[r.type] ?? r.type,
      status: STATUS_LABELS[r.status] ?? r.status,
      startLabel: start ? format(new Date(start), 'yyyy.MM.dd') : '—',
      endLabel: end ? format(new Date(end), 'yyyy.MM.dd') : '—',
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Saját beosztás</h1>
        <p className="text-muted-foreground text-sm">
          Saját műszakok, szabadság és betegszabadság kérelmek.
        </p>
      </div>
      <MyHrClient
        employeeId={emp._id.toString()}
        employeeName={emp.name}
        companyName={companyName}
        memberships={membershipOptions}
        initialEvents={initialEvents}
        requests={requestRows}
      />
    </Container>
  );
}
