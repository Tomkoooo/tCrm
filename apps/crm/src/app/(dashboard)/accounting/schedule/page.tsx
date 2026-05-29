import mongoose from 'mongoose';
import { requireAnyPermission, hasPermission } from '@crm/auth';
import { connectDB, Employee } from '@crm/db';
import { listScheduleEntries, listActiveCompanies, buildCompanyFilter } from '@crm/core';
import { HR_READ_PERMISSION_KEYS } from '@crm/lib';
import { Container } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { SchedulePageClient } from './_components/schedule-page-client';
import type { CalendarEvent } from '../_components/hr-schedule-calendar';

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const canWrite = await hasPermission('hr:write');
  const { allowedCompanyIds } = await getHrSessionScope();
  const sp = await searchParams;
  const employeeId = typeof sp.employeeId === 'string' ? sp.employeeId : undefined;
  const companyId = typeof sp.companyId === 'string' ? sp.companyId : undefined;

  await connectDB();

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const [entries, companies] = await Promise.all([
    listScheduleEntries({
      start: rangeStart,
      end: rangeEnd,
      employeeId:
        employeeId && mongoose.Types.ObjectId.isValid(employeeId)
          ? new mongoose.Types.ObjectId(employeeId)
          : undefined,
      companyId:
        companyId && mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : undefined,
      allowedCompanyIds,
    }),
    listActiveCompanies(allowedCompanyIds),
  ]);

  const empFilter = buildCompanyFilter(allowedCompanyIds);
  const employees = await Employee.find({ ...empFilter, isActive: true })
    .sort({ name: 1 })
    .select({ name: 1 })
    .lean()
    .exec();

  const initialEvents: CalendarEvent[] = entries.map((e) => ({
    id: e._id.toString(),
    title: e.title ?? (e.kind === 'shift' ? 'Műszak' : e.kind),
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    kind: e.kind,
    employeeId: e.employeeId.toString(),
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Beosztás</h1>
        <p className="text-muted-foreground text-sm">Heti és havi naptár nézet.</p>
      </div>
      <SchedulePageClient
        editable={canWrite}
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
        employees={employees.map((e) => ({ _id: String(e._id), name: e.name }))}
        initialEvents={initialEvents}
        initialEmployeeId={employeeId}
        initialCompanyId={companyId}
      />
    </Container>
  );
}
