import {
  connectDB,
  Employee,
  ScheduleEntry,
  type IEmployee,
  type IScheduleEntry,
} from '@crm/db-core';
import type { Types } from 'mongoose';
import { buildIcsCalendar, type IcsEvent } from './ics';
import { jobEventDisplayName } from './calendar-merge';
import { SCHEDULE_PLAN_MODULE, SCHEDULE_PLAN_REF_TYPE } from './schedule-plans';

/** How far back/forward a subscribed feed reaches. */
const FEED_PAST_DAYS = 60;
const FEED_FUTURE_DAYS = 365;

const KIND_PREFIX: Record<string, string> = {
  job: 'Szállítás',
  off: 'Távollét',
  shift: 'Műszak',
  other: 'Egyéb',
};

function entrySummary(entry: IScheduleEntry): string {
  if (entry.kind === 'job') return jobEventDisplayName(entry.title) || 'Szállítás';
  const title = entry.title?.trim();
  const location = entry.locationLabel?.trim();
  if (location && title && title !== location) return `${title} — ${location}`;
  return title || location || KIND_PREFIX[entry.kind] || 'Beosztás';
}

export function scheduleEntryToIcsEvent(entry: IScheduleEntry, appUrl?: string): IcsEvent {
  const ref = entry.sourceRef as { module?: string; refType?: string; refId?: unknown } | undefined;
  const jobId = ref?.module === 'logistics' ? ref.refId : undefined;

  const descriptionParts: string[] = [];
  if (entry.role) descriptionParts.push(`Feladat: ${entry.role}`);
  if (entry.notes?.trim()) descriptionParts.push(entry.notes.trim());

  return {
    // Stable per entry, so a re-subscribe or re-download updates in place.
    uid: `${String(entry._id)}@tcrm`,
    start: entry.start,
    end: entry.end,
    summary: entrySummary(entry),
    description: descriptionParts.join('\n') || undefined,
    location: entry.locationLabel?.trim() || undefined,
    url: appUrl && jobId ? `${appUrl}/logistics/jobs/${String(jobId)}` : undefined,
    // Mongo bumps updatedAt on every edit, which is exactly the SEQUENCE signal
    // calendar clients use to decide an event changed.
    sequence: Math.floor(entry.updatedAt.getTime() / 1000) % 2147483647,
    lastModified: entry.updatedAt,
  };
}

export async function findEmployeeByCalendarToken(token: string): Promise<IEmployee | null> {
  if (!token?.trim() || token.trim().length < 16) return null;
  await connectDB();
  return Employee.findOne({ calendarFeedToken: token.trim(), isActive: true }).exec();
}

/**
 * The employee's personal feed: every schedule entry (plan shifts, logistics jobs,
 * approved leave) in a rolling window, so one subscription covers everything.
 */
export async function buildEmployeeCalendarFeed(params: {
  employee: IEmployee;
  appUrl?: string;
  now?: Date;
}): Promise<string> {
  await connectDB();
  const now = params.now ?? new Date();
  const start = new Date(now.getTime() - FEED_PAST_DAYS * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + FEED_FUTURE_DAYS * 24 * 60 * 60 * 1000);

  const entries = await ScheduleEntry.find({
    employeeId: params.employee._id,
    start: { $lt: end },
    end: { $gt: start },
  })
    .sort({ start: 1 })
    .exec();

  return buildIcsCalendar(
    entries.map((e) => scheduleEntryToIcsEvent(e, params.appUrl)),
    {
      calendarName: `Beosztás — ${params.employee.name}`,
      reminderMinutes: 60,
      refreshIntervalMinutes: 60,
      now,
    }
  );
}

/** One plan's shifts for one employee — the single-use ".ics letöltés" in the email. */
export async function buildPlanCalendarForEmployee(params: {
  planId: Types.ObjectId | string;
  employee: IEmployee;
  planTitle: string;
  appUrl?: string;
  now?: Date;
}): Promise<string> {
  await connectDB();

  const entries = await ScheduleEntry.find({
    'sourceRef.module': SCHEDULE_PLAN_MODULE,
    'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
    'sourceRef.refId': params.planId,
    employeeId: params.employee._id,
  })
    .sort({ start: 1 })
    .exec();

  return buildIcsCalendar(
    entries.map((e) => scheduleEntryToIcsEvent(e, params.appUrl)),
    {
      calendarName: `${params.planTitle} — ${params.employee.name}`,
      reminderMinutes: 60,
      now: params.now,
    }
  );
}
