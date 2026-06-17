import mongoose from 'mongoose';
import { redirect } from 'next/navigation';
import { connectDB, Employee } from '@crm/db';
import {
  listScheduleEntries,
  listActiveCompanies,
  listManagedEmployeeIds,
  listTeamsLedByUser,
  assertCanReadTeamSchedule,
  hasHrWriteScheduleAccess,
} from '@crm/core';
import { resolveEmployeeScheduleColor } from '@crm/lib';
import { Container } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { TeamSchedulePageClient } from './_components/team-schedule-page-client';
import type { CalendarEvent, EmployeeCalendarMeta } from '../../_components/hr-schedule-calendar';

export default async function TeamSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId, permissions, allowedCompanyIds } = await getHrSessionScope();

  try {
    await assertCanReadTeamSchedule(userId, permissions);
  } catch {
    redirect('/accounting/my');
  }

  const canWrite =
    hasHrWriteScheduleAccess(permissions) ||
    (await listManagedEmployeeIds(userId, undefined, permissions)).length > 0;
  const sp = await searchParams;
  const companyId = typeof sp.companyId === 'string' ? sp.companyId : undefined;

  await connectDB();

  const companyOid =
    companyId && mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : undefined;

  const managedIds = await listManagedEmployeeIds(userId, companyOid, permissions);
  if (!canWrite || (!hasHrWriteScheduleAccess(permissions) && managedIds.length === 0)) {
    return (
      <Container className="flex max-w-6xl flex-col gap-4">
        <h1 className="text-2xl font-bold">Csapatom beosztása</h1>
        <p className="text-muted-foreground text-sm">
          Nincs olyan csapat, amelynek Ön a vezetője. A HR állítja be a csapatvezetőt a Csapatok
          menüben.
        </p>
      </Container>
    );
  }

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const filterEmployeeIds = hasHrWriteScheduleAccess(permissions) ? undefined : managedIds;

  const [entries, companies, ledTeams] = await Promise.all([
    listScheduleEntries({
      start: rangeStart,
      end: rangeEnd,
      employeeIds: filterEmployeeIds,
      companyId: companyOid,
      allowedCompanyIds,
    }),
    listActiveCompanies(allowedCompanyIds),
    listTeamsLedByUser(userId, companyOid),
  ]);

  const employeeDocs = await Employee.find({
    _id: { $in: filterEmployeeIds ?? entries.map((e) => e.employeeId) },
    isActive: true,
  })
    .sort({ name: 1 })
    .select({ name: 1, companyId: 1, calendarColor: 1 })
    .lean()
    .exec();

  const companyNameById = new Map(companies.map((c) => [String(c._id), c.name]));
  const employeeById = new Map(employeeDocs.map((e) => [String(e._id), e]));

  const employees = employeeDocs.map((e) => {
    const coName = companyNameById.get(String(e.companyId)) ?? '—';
    return {
      _id: String(e._id),
      name: e.name,
      companyId: String(e.companyId),
      label: companyOid ? e.name : `${e.name} · ${coName}`,
    };
  });

  const employeeLegend: EmployeeCalendarMeta[] = employeeDocs.map((e) => {
    const coName = companyNameById.get(String(e.companyId)) ?? '—';
    return {
      _id: String(e._id),
      name: companyOid ? e.name : `${e.name} · ${coName}`,
      color: resolveEmployeeScheduleColor(String(e._id), e.calendarColor),
    };
  });

  const initialEvents: CalendarEvent[] = entries.map((e) => {
    const empId = e.employeeId.toString();
    const emp = employeeById.get(empId);
    const location = [e.locationLabel, e.locationAddress].filter(Boolean).join(' — ');
    const baseTitle = e.title ?? (e.kind === 'shift' ? 'Műszak' : e.kind);
    return {
      id: e._id.toString(),
      title: location ? `${baseTitle} · ${location}` : baseTitle,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      kind: e.kind,
      employeeId: empId,
      employeeName: emp?.name,
      color: resolveEmployeeScheduleColor(empId, emp?.calendarColor),
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Csapatom beosztása</h1>
        <p className="text-muted-foreground text-sm">
          {ledTeams.length > 0
            ? `Vezetett csapatok: ${ledTeams.map((t) => t.name).join(', ')}`
            : 'Csapattagok beosztása — szabadság/beteg kérelmek továbbra is HR jóváhagyású.'}
        </p>
      </div>
      <TeamSchedulePageClient
        editable={canWrite}
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
        employees={employees}
        employeeLegend={employeeLegend}
        initialEvents={initialEvents}
        initialCompanyId={companyId}
      />
    </Container>
  );
}
