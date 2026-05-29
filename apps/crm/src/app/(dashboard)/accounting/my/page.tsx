import { requireAuth } from '@crm/auth';
import { connectDB, Company, HrRequest } from '@crm/db';
import { getEmployeeByUserId, listScheduleEntries } from '@crm/core';
import { Container } from '@crm/ui';
import { format } from 'date-fns';
import mongoose from 'mongoose';
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

export default async function MyHrPage() {
  const user = await requireAuth();
  if (!user) return null;
  await connectDB();

  const userId = new mongoose.Types.ObjectId(user.id);
  const emp = await getEmployeeByUserId(userId);
  if (!emp) {
    return <MyNoEmployee />;
  }

  const company = await Company.findById(emp.companyId).lean().exec();
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
        employeeName={emp.name}
        companyName={company?.name ?? '—'}
        initialEvents={initialEvents}
        requests={requestRows}
      />
    </Container>
  );
}
