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

  const companyOid =
    companyId && mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : undefined;

  const [entries, companies] = await Promise.all([
    listScheduleEntries({
      start: rangeStart,
      end: rangeEnd,
      employeeId:
        employeeId && mongoose.Types.ObjectId.isValid(employeeId)
          ? new mongoose.Types.ObjectId(employeeId)
          : undefined,
      companyId: companyOid,
      allowedCompanyIds,
    }),
    listActiveCompanies(allowedCompanyIds),
  ]);

  const companyNameById = new Map(companies.map((c) => [String(c._id), c.name]));

  const empFilter: Record<string, unknown> = {
    ...buildCompanyFilter(allowedCompanyIds),
    isActive: true,
  };
  if (companyOid) empFilter.companyId = companyOid;

  const employeeDocs = await Employee.find(empFilter)
    .sort({ name: 1, companyId: 1 })
    .select({ name: 1, companyId: 1 })
    .lean()
    .exec();

  const employees = employeeDocs.map((e) => {
    const coName = companyNameById.get(String(e.companyId)) ?? '—';
    return {
      _id: String(e._id),
      name: e.name,
      companyId: String(e.companyId),
      label: companyOid ? e.name : `${e.name} · ${coName}`,
    };
  });

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
        <p className="text-muted-foreground text-sm">
          Cégenként külön naptár — egy személy több cégnél külön dolgozói rekord.
        </p>
      </div>
      <SchedulePageClient
        editable={canWrite}
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
        employees={employees}
        initialEvents={initialEvents}
        initialEmployeeId={employeeId}
        initialCompanyId={companyId}
      />
    </Container>
  );
}
