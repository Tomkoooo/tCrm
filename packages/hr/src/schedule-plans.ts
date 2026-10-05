import {
  connectDB,
  Employee,
  ScheduleEntry,
  SchedulePlan,
  type IEmployee,
  type IScheduleEntry,
  type ISchedulePlan,
} from '@crm/db-core';
import { combineHrDayAndTime, formatHrDateKey, formatHrTime, parseHrDateOnly } from '@crm/lib';
import mongoose, { type Types } from 'mongoose';

/**
 * Beosztás (roster plan) — the grid that replaces the hand-maintained Excel.
 *
 * A plan owns a rectangle of days × employees. Each filled cell is a real
 * `ScheduleEntry` (`kind: 'shift'`) tagged with `sourceRef.refType = 'plan'`, so
 * the HR calendar, monthly hours and leave summary pick plan shifts up with no
 * extra wiring — and deleting a plan cleans its entries up by that same tag.
 */

export const SCHEDULE_PLAN_MODULE = 'hr';
export const SCHEDULE_PLAN_REF_TYPE = 'plan';
export const DEFAULT_SHIFT_MINUTES = 480;

/** `HH:MM` in 24h form. */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export function isValidDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value.trim());
}

export function isValidShiftTime(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

/** Inclusive list of Budapest-dated `YYYY-MM-DD` keys. Capped to keep a grid renderable. */
export function eachPlanDayKey(start: Date, end: Date, maxDays = 120): string[] {
  const keys: string[] = [];
  const lastKey = formatHrDateKey(end);
  let cursor = parseHrDateOnly(formatHrDateKey(start));

  for (let i = 0; i < maxDays; i++) {
    const key = formatHrDateKey(cursor);
    keys.push(key);
    if (key >= lastKey) break;
    // Step 36h then re-truncate so DST transitions can't skip or repeat a day.
    cursor = parseHrDateOnly(formatHrDateKey(new Date(cursor.getTime() + 36 * 60 * 60 * 1000)));
  }

  return keys;
}

export type ParsedScheduleCell = {
  /** Omitted for a location-only cell, which becomes an all-day shift. */
  startTime?: string;
  locationLabel?: string;
};

/**
 * Parses the roster's cell shorthand — `"13:00 BOK"`, `"8:00 Kispest"`, `"9:00"`.
 * `"-"`, `"–"` and blanks mean "not working" and return null.
 */
export function parseScheduleCell(raw: string): ParsedScheduleCell | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === '–' || trimmed === '—') return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(.*)$/);
  if (!match) {
    // Location-only cell ("Remiz") — a shift with no stated start time.
    return { locationLabel: trimmed.slice(0, 120) };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return { locationLabel: trimmed.slice(0, 120) };

  const location = match[3]?.trim();
  return {
    startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    locationLabel: location ? location.slice(0, 120) : undefined,
  };
}

/** Inverse of `parseScheduleCell` — what the grid and the email table show. */
export function formatScheduleCell(entry: {
  start: Date;
  locationLabel?: string;
  allDay?: boolean;
}): string {
  const location = entry.locationLabel?.trim();
  if (entry.allDay) return location || 'Egész nap';
  const time = formatHrTime(entry.start);
  return location ? `${time} ${location}` : time;
}

export type SchedulePlanCellDTO = {
  entryId: string;
  employeeId: string;
  dayKey: string;
  start: Date;
  end: Date;
  startTime: string;
  durationMinutes: number;
  locationLabel?: string;
  notes?: string;
  label: string;
};

export type SchedulePlanGrid = {
  plan: ISchedulePlan;
  dayKeys: string[];
  employees: IEmployee[];
  /** `${employeeId}:${dayKey}` → cell */
  cells: Map<string, SchedulePlanCellDTO>;
  /** dayKey → free-text event notes */
  dayNotes: Map<string, string[]>;
};

export function cellKey(employeeId: string, dayKey: string): string {
  return `${employeeId}:${dayKey}`;
}

function entryToCell(entry: IScheduleEntry): SchedulePlanCellDTO {
  const durationMinutes = Math.max(
    0,
    Math.round((entry.end.getTime() - entry.start.getTime()) / 60000)
  );
  return {
    entryId: String(entry._id),
    employeeId: String(entry.employeeId),
    dayKey: formatHrDateKey(entry.start),
    start: entry.start,
    end: entry.end,
    startTime: formatHrTime(entry.start),
    durationMinutes,
    locationLabel: entry.locationLabel,
    notes: entry.notes,
    label: formatScheduleCell(entry),
  };
}

export type CreateSchedulePlanParams = {
  companyId: Types.ObjectId | string;
  title: string;
  /** `YYYY-MM-DD` */
  startDateKey: string;
  endDateKey: string;
  employeeIds: Array<Types.ObjectId | string>;
  defaultShiftMinutes?: number;
  notes?: string;
  actorUserId: Types.ObjectId | string;
};

export async function createSchedulePlan(params: CreateSchedulePlanParams): Promise<ISchedulePlan> {
  await connectDB();

  if (!isValidDayKey(params.startDateKey) || !isValidDayKey(params.endDateKey)) {
    throw new Error('Érvénytelen dátum (YYYY-MM-DD).');
  }
  if (params.endDateKey < params.startDateKey) {
    throw new Error('A záró dátum nem lehet korábbi a kezdő dátumnál.');
  }
  if (!params.employeeIds.length) {
    throw new Error('Válassz legalább egy dolgozót a beosztáshoz.');
  }

  const companyId = toOid(params.companyId);
  const employeeIds = params.employeeIds.map(toOid);

  // Every column must be an active employee of this plan's company.
  const employees = await Employee.find({ _id: { $in: employeeIds }, companyId })
    .select({ _id: 1 })
    .lean()
    .exec();
  if (employees.length !== employeeIds.length) {
    throw new Error('Egy vagy több kiválasztott dolgozó nem ehhez a céghez tartozik.');
  }

  const actor = toOid(params.actorUserId);

  return SchedulePlan.create({
    companyId,
    title: params.title.trim(),
    startDate: parseHrDateOnly(params.startDateKey),
    endDate: parseHrDateOnly(params.endDateKey),
    status: 'draft',
    employeeIds,
    dayNotes: [],
    defaultShiftMinutes: params.defaultShiftMinutes ?? DEFAULT_SHIFT_MINUTES,
    notes: params.notes?.trim() || undefined,
    publishCount: 0,
    createdBy: actor,
    updatedBy: actor,
  });
}

export async function getSchedulePlanById(
  id: Types.ObjectId | string
): Promise<ISchedulePlan | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(String(id))) return null;
  return SchedulePlan.findById(toOid(id)).exec();
}

export async function listSchedulePlans(options?: {
  companyId?: Types.ObjectId | string;
  status?: 'draft' | 'published';
  limit?: number;
}): Promise<ISchedulePlan[]> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (options?.companyId) filter.companyId = toOid(options.companyId);
  if (options?.status) filter.status = options.status;
  return SchedulePlan.find(filter)
    .sort({ startDate: -1 })
    .limit(options?.limit ?? 200)
    .exec();
}

/** Entries belonging to a plan, oldest first. */
export async function listPlanEntries(planId: Types.ObjectId | string): Promise<IScheduleEntry[]> {
  await connectDB();
  return ScheduleEntry.find({
    'sourceRef.module': SCHEDULE_PLAN_MODULE,
    'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
    'sourceRef.refId': toOid(planId),
  })
    .sort({ start: 1 })
    .exec();
}

export async function getSchedulePlanGrid(
  planId: Types.ObjectId | string
): Promise<SchedulePlanGrid | null> {
  const plan = await getSchedulePlanById(planId);
  if (!plan) return null;

  const [employees, entries] = await Promise.all([
    Employee.find({ _id: { $in: plan.employeeIds } }).exec(),
    listPlanEntries(plan._id),
  ]);

  // Preserve the plan's column order rather than Mongo's.
  const byId = new Map<string, IEmployee>(employees.map((e) => [String(e._id), e]));
  const ordered: IEmployee[] = [];
  for (const id of plan.employeeIds) {
    const employee = byId.get(String(id));
    if (employee) ordered.push(employee);
  }

  const cells = new Map<string, SchedulePlanCellDTO>();
  for (const entry of entries) {
    const cell = entryToCell(entry);
    cells.set(cellKey(cell.employeeId, cell.dayKey), cell);
  }

  const dayNotes = new Map<string, string[]>();
  for (const note of plan.dayNotes ?? []) {
    const filled = (note.notes ?? []).filter((n) => n?.trim());
    if (filled.length) dayNotes.set(formatHrDateKey(note.date), filled);
  }

  return {
    plan,
    dayKeys: eachPlanDayKey(plan.startDate, plan.endDate),
    employees: ordered,
    cells,
    dayNotes,
  };
}

export type UpsertPlanCellParams = {
  planId: Types.ObjectId | string;
  employeeId: Types.ObjectId | string;
  /** `YYYY-MM-DD` */
  dayKey: string;
  /** `HH:MM`; omit for an all-day cell. */
  startTime?: string;
  durationMinutes?: number;
  locationLabel?: string;
  notes?: string;
  actorUserId: Types.ObjectId | string;
};

export async function upsertPlanCell(params: UpsertPlanCellParams): Promise<IScheduleEntry> {
  await connectDB();

  const plan = await getSchedulePlanById(params.planId);
  if (!plan) throw new Error('Beosztás nem található.');
  if (!isValidDayKey(params.dayKey)) throw new Error('Érvénytelen nap (YYYY-MM-DD).');

  const dayKeys = eachPlanDayKey(plan.startDate, plan.endDate);
  if (!dayKeys.includes(params.dayKey)) {
    throw new Error('A nap kívül esik a beosztás időszakán.');
  }

  const employeeOid = toOid(params.employeeId);
  if (!plan.employeeIds.some((id) => id.equals(employeeOid))) {
    throw new Error('Ez a dolgozó nincs kiválasztva ehhez a beosztáshoz.');
  }

  const employee = await Employee.findById(employeeOid).select({ companyId: 1 }).lean().exec();
  if (!employee) throw new Error('Dolgozó nem található.');

  const allDay = !params.startTime?.trim();
  if (!allDay && !isValidShiftTime(params.startTime!)) {
    throw new Error('Érvénytelen kezdési időpont (HH:MM).');
  }

  const durationMinutes =
    params.durationMinutes && params.durationMinutes > 0
      ? Math.min(params.durationMinutes, 24 * 60)
      : plan.defaultShiftMinutes || DEFAULT_SHIFT_MINUTES;

  const start = allDay
    ? parseHrDateOnly(params.dayKey)
    : combineHrDayAndTime(parseHrDateOnly(params.dayKey), params.startTime!.trim());
  const end = allDay
    ? new Date(start.getTime() + 24 * 60 * 60 * 1000)
    : new Date(start.getTime() + durationMinutes * 60000);

  const location = params.locationLabel?.trim().slice(0, 120) || undefined;
  const actor = toOid(params.actorUserId);

  // One cell per employee per day: match on the plan tag + employee + that day.
  const dayStart = parseHrDateOnly(params.dayKey);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const existing = await ScheduleEntry.findOne({
    'sourceRef.module': SCHEDULE_PLAN_MODULE,
    'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
    'sourceRef.refId': plan._id,
    employeeId: employeeOid,
    start: { $gte: dayStart, $lt: dayEnd },
  }).exec();

  const title = location || 'Műszak';

  if (existing) {
    existing.start = start;
    existing.end = end;
    existing.allDay = allDay;
    existing.title = title;
    existing.locationLabel = location;
    existing.notes = params.notes?.trim() || undefined;
    existing.companyId = employee.companyId;
    existing.updatedBy = actor;
    await existing.save();
    return existing;
  }

  return ScheduleEntry.create({
    employeeId: employeeOid,
    companyId: employee.companyId,
    start,
    end,
    allDay,
    kind: 'shift',
    title,
    locationLabel: location,
    notes: params.notes?.trim() || undefined,
    sourceRef: {
      module: SCHEDULE_PLAN_MODULE,
      refType: SCHEDULE_PLAN_REF_TYPE,
      refId: plan._id,
      label: plan.title,
    },
    createdBy: actor,
    updatedBy: actor,
  });
}

export async function clearPlanCell(params: {
  planId: Types.ObjectId | string;
  employeeId: Types.ObjectId | string;
  dayKey: string;
}): Promise<boolean> {
  await connectDB();
  if (!isValidDayKey(params.dayKey)) throw new Error('Érvénytelen nap (YYYY-MM-DD).');

  const dayStart = parseHrDateOnly(params.dayKey);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const result = await ScheduleEntry.deleteOne({
    'sourceRef.module': SCHEDULE_PLAN_MODULE,
    'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
    'sourceRef.refId': toOid(params.planId),
    employeeId: toOid(params.employeeId),
    start: { $gte: dayStart, $lt: dayEnd },
  }).exec();

  return (result.deletedCount ?? 0) > 0;
}

export type UpdateSchedulePlanParams = {
  id: Types.ObjectId | string;
  title?: string;
  notes?: string;
  defaultShiftMinutes?: number;
  employeeIds?: Array<Types.ObjectId | string>;
  /** dayKey → notes; replaces that day's notes. */
  dayNotes?: Record<string, string[]>;
  actorUserId: Types.ObjectId | string;
};

export async function updateSchedulePlan(params: UpdateSchedulePlanParams): Promise<ISchedulePlan> {
  await connectDB();
  const plan = await getSchedulePlanById(params.id);
  if (!plan) throw new Error('Beosztás nem található.');

  if (params.title !== undefined) {
    const title = params.title.trim();
    if (!title) throw new Error('A beosztás megnevezése kötelező.');
    plan.title = title;
  }
  if (params.notes !== undefined) plan.notes = params.notes.trim() || undefined;
  if (params.defaultShiftMinutes !== undefined && params.defaultShiftMinutes > 0) {
    plan.defaultShiftMinutes = Math.min(params.defaultShiftMinutes, 24 * 60);
  }

  if (params.employeeIds) {
    const employeeIds = params.employeeIds.map(toOid);
    const employees = await Employee.find({ _id: { $in: employeeIds }, companyId: plan.companyId })
      .select({ _id: 1 })
      .lean()
      .exec();
    if (employees.length !== employeeIds.length) {
      throw new Error('Egy vagy több dolgozó nem ehhez a céghez tartozik.');
    }

    // Dropping a column must not leave orphaned shifts behind.
    const removed = plan.employeeIds.filter((id) => !employeeIds.some((n) => n.equals(id)));
    if (removed.length) {
      await ScheduleEntry.deleteMany({
        'sourceRef.module': SCHEDULE_PLAN_MODULE,
        'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
        'sourceRef.refId': plan._id,
        employeeId: { $in: removed },
      }).exec();
    }
    plan.employeeIds = employeeIds;
  }

  if (params.dayNotes) {
    const planDayKeys = new Set(eachPlanDayKey(plan.startDate, plan.endDate));
    const merged = new Map(
      (plan.dayNotes ?? []).map((n) => [formatHrDateKey(n.date), n.notes ?? []])
    );
    for (const [dayKey, notes] of Object.entries(params.dayNotes)) {
      if (!planDayKeys.has(dayKey)) continue;
      const cleaned = notes.map((n) => n.trim().slice(0, 300)).filter(Boolean);
      if (cleaned.length) merged.set(dayKey, cleaned);
      else merged.delete(dayKey);
    }
    plan.dayNotes = [...merged.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, notes]) => ({ date: parseHrDateOnly(dayKey), notes }));
  }

  plan.updatedBy = toOid(params.actorUserId);
  await plan.save();
  return plan;
}

export async function deleteSchedulePlan(id: Types.ObjectId | string): Promise<void> {
  await connectDB();
  const plan = await getSchedulePlanById(id);
  if (!plan) throw new Error('Beosztás nem található.');

  await ScheduleEntry.deleteMany({
    'sourceRef.module': SCHEDULE_PLAN_MODULE,
    'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
    'sourceRef.refId': plan._id,
  }).exec();
  await plan.deleteOne();
}

/** Flips the plan to published and stamps the send. Mail goes out separately. */
export async function markSchedulePlanPublished(
  id: Types.ObjectId | string,
  actorUserId: Types.ObjectId | string
): Promise<ISchedulePlan> {
  await connectDB();
  const plan = await getSchedulePlanById(id);
  if (!plan) throw new Error('Beosztás nem található.');

  plan.status = 'published';
  plan.publishedAt = new Date();
  plan.publishedBy = toOid(actorUserId);
  plan.publishCount += 1;
  plan.updatedBy = toOid(actorUserId);
  await plan.save();
  return plan;
}

/** The plan a schedule entry belongs to, or null when it isn't plan-owned. */
export async function getPlanForEntry(entry: IScheduleEntry): Promise<ISchedulePlan | null> {
  const ref = entry.sourceRef as { module?: string; refType?: string; refId?: unknown } | undefined;
  if (ref?.module !== SCHEDULE_PLAN_MODULE || ref.refType !== SCHEDULE_PLAN_REF_TYPE) return null;
  if (!ref.refId) return null;
  return getSchedulePlanById(String(ref.refId));
}
