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
 *
 * A cell is **place + start + end + description**. The place is what makes a cell
 * exist (it is where the employee has to show up); the times default from the plan,
 * and the description is optional detail about the work.
 */

export const SCHEDULE_PLAN_MODULE = 'hr';
export const SCHEDULE_PLAN_REF_TYPE = 'plan';
export const DEFAULT_SHIFT_HOURS = 8;
export const DEFAULT_START_TIME = '08:00';

/** `HH:MM` in 24h form. */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export function isValidDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value.trim());
}

export function isValidShiftTime(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

/** Plans written before the hours switch stored `defaultShiftMinutes`; read either. */
export function planShiftHours(plan: Pick<ISchedulePlan, 'defaultShiftHours'>): number {
  const hours = Number(plan.defaultShiftHours);
  if (Number.isFinite(hours) && hours > 0) return hours;
  const legacyMinutes = Number((plan as { defaultShiftMinutes?: number }).defaultShiftMinutes);
  if (Number.isFinite(legacyMinutes) && legacyMinutes > 0) return legacyMinutes / 60;
  return DEFAULT_SHIFT_HOURS;
}

export function planStartTime(plan: Pick<ISchedulePlan, 'defaultStartTime'>): string {
  const value = plan.defaultStartTime?.trim();
  return value && isValidShiftTime(value) ? value : DEFAULT_START_TIME;
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
    cursor = parseHrDateOnly(formatHrDateKey(new Date(cursor.getTime() + 36 * MS_PER_HOUR)));
  }

  return keys;
}

export type SchedulePlanCellDTO = {
  entryId: string;
  employeeId: string;
  dayKey: string;
  /** Venue the employee reports to — "BOK", "Kispest". */
  place: string;
  startTime: string;
  endTime: string;
  /** Optional detail about the work itself. */
  description?: string;
  start: Date;
  end: Date;
  hours: number;
  /** True when the shift runs past midnight into the next day. */
  overnight: boolean;
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
  const dayKey = formatHrDateKey(entry.start);
  const ms = entry.end.getTime() - entry.start.getTime();

  return {
    entryId: String(entry._id),
    employeeId: String(entry.employeeId),
    dayKey,
    place: entry.locationLabel ?? entry.title ?? '',
    startTime: formatHrTime(entry.start),
    endTime: formatHrTime(entry.end),
    description: entry.notes,
    start: entry.start,
    end: entry.end,
    hours: Math.round((ms / MS_PER_HOUR) * 100) / 100,
    overnight: formatHrDateKey(entry.end) !== dayKey,
  };
}

export type CreateSchedulePlanParams = {
  companyId: Types.ObjectId | string;
  title: string;
  /** `YYYY-MM-DD` */
  startDateKey: string;
  endDateKey: string;
  employeeIds: Array<Types.ObjectId | string>;
  defaultShiftHours?: number;
  defaultStartTime?: string;
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

  const startTime = params.defaultStartTime?.trim();
  if (startTime && !isValidShiftTime(startTime)) {
    throw new Error('Érvénytelen alapértelmezett kezdés (ÓÓ:PP).');
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
    defaultShiftHours: params.defaultShiftHours ?? DEFAULT_SHIFT_HOURS,
    defaultStartTime: startTime || DEFAULT_START_TIME,
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

/**
 * Resolves a cell's absolute start/end. An end at or before the start is read as
 * running past midnight — a 22:00–02:00 load-out is an ordinary event shift — so it
 * moves to the next day rather than being rejected.
 */
export function resolveCellWindow(
  dayKey: string,
  startTime: string,
  endTime: string
): { start: Date; end: Date } {
  const day = parseHrDateOnly(dayKey);
  const start = combineHrDayAndTime(day, startTime);
  let end = combineHrDayAndTime(day, endTime);
  if (end.getTime() <= start.getTime()) {
    // Step 36h, not 24h: the Budapest day on which DST ends is 25 hours long, so
    // +24h lands back on the same calendar day and the shift would end before it
    // starts. Re-truncating a 36h step always yields the next day.
    const nextDay = parseHrDateOnly(formatHrDateKey(new Date(day.getTime() + 36 * MS_PER_HOUR)));
    end = combineHrDayAndTime(nextDay, endTime);
  }
  return { start, end };
}

/** `"08:00" + 8.5` → `"16:30"`, wrapping past midnight. */
export function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h! * 60 + m! + Math.round(hours * 60);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

export type UpsertPlanCellParams = {
  planId: Types.ObjectId | string;
  employeeId: Types.ObjectId | string;
  /** `YYYY-MM-DD` */
  dayKey: string;
  /** Venue — the one required field; a cell with no place is not a shift. */
  place: string;
  /** `HH:MM`; falls back to the plan's default start. */
  startTime?: string;
  /** `HH:MM`; falls back to start + the plan's default length. */
  endTime?: string;
  description?: string;
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

  const place = params.place?.trim().slice(0, 120);
  if (!place) throw new Error('A helyszín megadása kötelező.');

  const employeeOid = toOid(params.employeeId);
  if (!plan.employeeIds.some((id) => id.equals(employeeOid))) {
    throw new Error('Ez a dolgozó nincs kiválasztva ehhez a beosztáshoz.');
  }

  const employee = await Employee.findById(employeeOid).select({ companyId: 1 }).lean().exec();
  if (!employee) throw new Error('Dolgozó nem található.');

  const startTime = params.startTime?.trim() || planStartTime(plan);
  if (!isValidShiftTime(startTime)) throw new Error('Érvénytelen kezdési időpont (ÓÓ:PP).');

  const endTime = params.endTime?.trim() || addHoursToTime(startTime, planShiftHours(plan));
  if (!isValidShiftTime(endTime)) throw new Error('Érvénytelen befejezési időpont (ÓÓ:PP).');

  const { start, end } = resolveCellWindow(params.dayKey, startTime, endTime);
  const actor = toOid(params.actorUserId);
  const description = params.description?.trim().slice(0, 2000) || undefined;

  // One cell per employee per day: match on the plan tag + employee + that day.
  const dayStart = parseHrDateOnly(params.dayKey);
  const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);
  const existing = await ScheduleEntry.findOne({
    'sourceRef.module': SCHEDULE_PLAN_MODULE,
    'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
    'sourceRef.refId': plan._id,
    employeeId: employeeOid,
    start: { $gte: dayStart, $lt: dayEnd },
  }).exec();

  if (existing) {
    existing.start = start;
    existing.end = end;
    existing.allDay = false;
    existing.title = place;
    existing.locationLabel = place;
    existing.notes = description;
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
    allDay: false,
    kind: 'shift',
    title: place,
    locationLabel: place,
    notes: description,
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
  const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);

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
  defaultShiftHours?: number;
  defaultStartTime?: string;
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
  if (params.defaultShiftHours !== undefined && params.defaultShiftHours > 0) {
    plan.defaultShiftHours = Math.min(params.defaultShiftHours, 24);
  }
  if (params.defaultStartTime !== undefined) {
    const startTime = params.defaultStartTime.trim();
    if (startTime && !isValidShiftTime(startTime)) {
      throw new Error('Érvénytelen alapértelmezett kezdés (ÓÓ:PP).');
    }
    plan.defaultStartTime = startTime || DEFAULT_START_TIME;
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
