'use server';

import { getCurrentUser, requireAnyPermission } from '@crm/auth';
import {
  listScheduleEntries,
  listEmployees,
  ensureDefaultCompany,
  listMembershipsForUser,
  userOwnsEmployee,
  mergeJobScheduleEvents,
  jobEventDisplayName,
  HR_READ_PERMISSION_KEYS,
} from '@crm/hr';
import { connectDB, LogisticsJob, type IScheduleEntry } from '@crm/db-core';
import { resolveEmployeeScheduleColor, scheduleKindFallbackColor } from '@crm/lib';

export type CalendarEventDTO = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind?: string;
  employeeId?: string;
  employeeName?: string;
  color?: string;
  href?: string;
  editable: boolean;
  jobId?: string;
  eventName?: string;
  roles?: string[];
  notes?: string;
};

function sourceJobId(entry: IScheduleEntry): string | undefined {
  const ref = entry.sourceRef as
    | {
        module?: string;
        refType?: string;
        refId?: { toString(): string };
        jobId?: { toString(): string };
      }
    | undefined;
  if (ref?.module !== 'logistics') return undefined;
  if (ref.refType === 'job' && ref.refId) return String(ref.refId);
  if (ref.jobId) return String(ref.jobId);
  return undefined;
}

async function logisticsJobIndex(entries: IScheduleEntry[]): Promise<{
  hrefs: Map<string, string>;
  jobIds: Map<string, string>;
}> {
  const hrefs = new Map<string, string>();
  const jobIds = new Map<string, string>();
  const pickupIds: string[] = [];
  for (const entry of entries) {
    const direct = sourceJobId(entry);
    if (direct) {
      hrefs.set(String(entry._id), `/logistics/jobs/${direct}`);
      jobIds.set(String(entry._id), direct);
      continue;
    }
    const ref = entry.sourceRef;
    if (ref?.module === 'logistics' && ref.refType === 'pickup' && ref.refId) {
      pickupIds.push(String(ref.refId));
    }
  }
  if (!pickupIds.length) return { hrefs, jobIds };

  await connectDB();
  const jobs = await LogisticsJob.find({ 'pickups._id': { $in: pickupIds } })
    .select({ _id: 1, pickups: 1 })
    .lean()
    .exec();
  const pickupToJob = new Map<string, string>();
  for (const job of jobs) {
    for (const pickup of job.pickups ?? []) {
      pickupToJob.set(String(pickup._id), String(job._id));
    }
  }
  for (const entry of entries) {
    if (jobIds.has(String(entry._id))) continue;
    const ref = entry.sourceRef;
    if (ref?.refType !== 'pickup' || !ref.refId) continue;
    const jobId = pickupToJob.get(String(ref.refId));
    if (!jobId) continue;
    hrefs.set(String(entry._id), `/logistics/jobs/${jobId}`);
    jobIds.set(String(entry._id), jobId);
  }
  return { hrefs, jobIds };
}

export async function fetchHrCalendarEventsAction(params: {
  start: string;
  end: string;
  companyId?: string;
  employeeId?: string;
}): Promise<CalendarEventDTO[]> {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  await ensureDefaultCompany();
  const start = new Date(params.start);
  const end = new Date(params.end);

  const employees = await listEmployees({
    activeOnly: true,
    companyId: params.companyId,
  });
  const nameMap = new Map(employees.map((e) => [String(e._id), e]));

  const entries = await listScheduleEntries({
    start,
    end,
    companyId: params.companyId,
    employeeId: params.employeeId,
    employeeIds: params.employeeId ? undefined : employees.map((e) => e._id),
  });

  const { hrefs, jobIds } = await logisticsJobIndex(entries);

  const mapped: CalendarEventDTO[] = entries.map((e) => {
    const emp = nameMap.get(String(e.employeeId));
    const color =
      emp?.calendarColor ||
      resolveEmployeeScheduleColor(String(e.employeeId)) ||
      scheduleKindFallbackColor(e.kind);
    const jobId = jobIds.get(String(e._id)) ?? sourceJobId(e);
    const eventName = e.kind === 'job' ? jobEventDisplayName(e.title) : undefined;
    return {
      id: String(e._id),
      title: e.kind === 'job' ? eventName! : e.title || e.kind,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      kind: e.kind,
      employeeId: String(e.employeeId),
      employeeName: emp?.name,
      color,
      href: hrefs.get(String(e._id)),
      editable: e.kind === 'shift' || e.kind === 'other',
      jobId,
      eventName,
      roles: e.role ? [e.role] : [],
      notes: e.notes,
    };
  });

  return mergeJobScheduleEvents(mapped);
}

export async function fetchMyCalendarEventsAction(params: {
  start: string;
  end: string;
  employeeId?: string;
}): Promise<CalendarEventDTO[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const memberships = await listMembershipsForUser(user.id);
  if (!memberships.length) return [];

  let selected = memberships;
  if (params.employeeId) {
    if (!(await userOwnsEmployee(user.id, params.employeeId))) return [];
    selected = memberships.filter((m) => String(m._id) === params.employeeId);
  }

  const entries = await listScheduleEntries({
    start: new Date(params.start),
    end: new Date(params.end),
    employeeIds: selected.map((m) => m._id),
  });
  const { hrefs, jobIds } = await logisticsJobIndex(entries);
  const empMap = new Map(selected.map((m) => [String(m._id), m]));

  const mapped: CalendarEventDTO[] = entries.map((e) => {
    const me = empMap.get(String(e.employeeId));
    const jobId = jobIds.get(String(e._id)) ?? sourceJobId(e);
    const eventName = e.kind === 'job' ? jobEventDisplayName(e.title) : undefined;
    return {
      id: String(e._id),
      title: e.kind === 'job' ? eventName! : e.title || e.kind,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      kind: e.kind,
      employeeId: String(e.employeeId),
      employeeName: me?.name,
      color: me?.calendarColor || resolveEmployeeScheduleColor(String(e.employeeId)),
      href: hrefs.get(String(e._id)),
      editable: false,
      jobId,
      eventName,
      roles: e.role ? [e.role] : [],
      notes: e.notes,
    };
  });

  return mergeJobScheduleEvents(mapped);
}
