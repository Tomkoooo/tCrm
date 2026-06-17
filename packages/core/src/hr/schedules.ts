import { eachDayInRange, isWorkday, combineHrDayAndTime } from '@crm/lib';
import {
  connectDB,
  Employee,
  ScheduleEntry,
  type IScheduleEntry,
  type ScheduleEntryKind,
  type ScheduleEntrySourceRef,
} from '@crm/db';
import type { Types } from 'mongoose';
import { assertCanManageEmployeeSchedule } from './team-scope';

export type ScheduleEntryWriteData = {
  employeeId: Types.ObjectId;
  start: Date;
  end: Date;
  allDay?: boolean;
  kind: ScheduleEntryKind;
  title?: string;
  notes?: string;
  locationLabel?: string;
  locationAddress?: string;
  sourceRef?: ScheduleEntrySourceRef;
};

export async function listScheduleEntries(params: {
  start: Date;
  end: Date;
  employeeId?: Types.ObjectId;
  employeeIds?: Types.ObjectId[];
  companyId?: Types.ObjectId;
  allowedCompanyIds: Types.ObjectId[] | null;
}): Promise<IScheduleEntry[]> {
  await connectDB();
  const filter: Record<string, unknown> = {
    start: { $lt: params.end },
    end: { $gt: params.start },
  };
  if (params.employeeId) filter.employeeId = params.employeeId;
  else if (params.employeeIds?.length) filter.employeeId = { $in: params.employeeIds };
  if (params.companyId) filter.companyId = params.companyId;
  else if (params.allowedCompanyIds !== null) {
    if (!params.allowedCompanyIds.length) return [];
    filter.companyId = { $in: params.allowedCompanyIds };
  }
  return ScheduleEntry.find(filter).sort({ start: 1 }).exec();
}

export async function createScheduleEntry(
  data: ScheduleEntryWriteData,
  actorUserId: Types.ObjectId,
  permissions: string[],
  options?: { skipScheduleEmail?: boolean }
): Promise<IScheduleEntry> {
  await connectDB();
  const emp = await Employee.findById(data.employeeId).exec();
  if (!emp) throw new Error('Dolgoz? nem tal?lhat?.');
  await assertCanManageEmployeeSchedule(actorUserId, data.employeeId, permissions);

  const entry = await ScheduleEntry.create({
    ...data,
    companyId: emp.companyId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  if (!options?.skipScheduleEmail && !data.sourceRef) {
    const { notifyScheduleEntryCreated } = await import('./schedule-mail');
    await notifyScheduleEntryCreated(entry, actorUserId).catch(() => undefined);
  }

  return entry;
}

export async function updateScheduleEntry(
  id: Types.ObjectId,
  data: Partial<Omit<ScheduleEntryWriteData, 'employeeId'>>,
  actorUserId: Types.ObjectId,
  permissions: string[],
  options?: { skipScheduleEmail?: boolean }
): Promise<IScheduleEntry> {
  await connectDB();
  const entry = await ScheduleEntry.findById(id).exec();
  if (!entry) throw new Error('Beoszt?s nem tal?lhat?.');
  await assertCanManageEmployeeSchedule(actorUserId, entry.employeeId, permissions);

  const before = {
    start: entry.start,
    end: entry.end,
    kind: entry.kind,
    title: entry.title,
    locationLabel: entry.locationLabel,
    locationAddress: entry.locationAddress,
  };

  Object.assign(entry, data, { updatedBy: actorUserId });
  await entry.save();

  if (!options?.skipScheduleEmail && !entry.sourceRef) {
    const { notifyScheduleEntryUpdated } = await import('./schedule-mail');
    await notifyScheduleEntryUpdated(entry, before, actorUserId).catch(() => undefined);
  }

  return entry;
}

export async function deleteScheduleEntry(
  id: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[],
  options?: { skipScheduleEmail?: boolean }
): Promise<void> {
  await connectDB();
  const entry = await ScheduleEntry.findById(id).exec();
  if (!entry) throw new Error('Beoszt?s nem tal?lhat?.');
  await assertCanManageEmployeeSchedule(actorUserId, entry.employeeId, permissions);

  if (!options?.skipScheduleEmail && !entry.sourceRef) {
    const { notifyScheduleEntryDeleted } = await import('./schedule-mail');
    await notifyScheduleEntryDeleted(entry, actorUserId).catch(() => undefined);
  }

  await ScheduleEntry.deleteOne({ _id: id }).exec();
}

function hasOverlap(
  existing: Array<{ start: Date; end: Date; kind: string }>,
  dayStart: Date,
  dayEnd: Date
): boolean {
  return existing.some(
    (e) => e.start < dayEnd && e.end > dayStart && (e.kind === 'off' || e.kind === 'shift')
  );
}

export async function bulkCreateScheduleEntries(
  data: {
    employeeIds: Types.ObjectId[];
    startDate: Date;
    endDate: Date;
    shiftStartTime: string;
    shiftEndTime: string;
    mode:
      | 'workdays'
      | 'selected_dates'
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday';
    selectedDates?: Date[];
    skipExisting?: boolean;
    locationLabel?: string;
    locationAddress?: string;
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<{ created: number; skipped: number }> {
  await connectDB();
  let created = 0;
  let skipped = 0;

  const dayOfWeekMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  const targetDays: Date[] =
    data.mode === 'selected_dates' && data.selectedDates?.length
      ? data.selectedDates
      : data.mode in dayOfWeekMap
        ? eachDayInRange(data.startDate, data.endDate).filter(
            (d) => d.getDay() === dayOfWeekMap[data.mode]
          )
        : eachDayInRange(data.startDate, data.endDate).filter((d) => isWorkday(d));

  for (const employeeId of data.employeeIds) {
    const emp = await Employee.findById(employeeId).exec();
    if (!emp) continue;
    await assertCanManageEmployeeSchedule(actorUserId, employeeId, permissions);

    const rangeStart = targetDays[0] ?? data.startDate;
    const rangeEnd = targetDays[targetDays.length - 1] ?? data.endDate;
    const existing = await ScheduleEntry.find({
      employeeId,
      start: { $lt: new Date(rangeEnd.getTime() + 86400000) },
      end: { $gt: rangeStart },
    })
      .lean()
      .exec();

    const existingEntries = existing.map((e) => ({
      start: new Date(e.start),
      end: new Date(e.end),
      kind: e.kind,
    }));

    for (const day of targetDays) {
      const start = combineHrDayAndTime(day, data.shiftStartTime);
      const end = combineHrDayAndTime(day, data.shiftEndTime);
      if (end <= start) {
        skipped++;
        continue;
      }

      if (data.skipExisting !== false && hasOverlap(existingEntries, start, end)) {
        skipped++;
        continue;
      }

      const entry = await ScheduleEntry.create({
        employeeId,
        companyId: emp.companyId,
        start,
        end,
        kind: 'shift',
        title: 'M?szak',
        locationLabel: data.locationLabel,
        locationAddress: data.locationAddress,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });
      existingEntries.push({ start, end, kind: 'shift' });
      created++;

      const { notifyScheduleEntryCreated } = await import('./schedule-mail');
      await notifyScheduleEntryCreated(entry, actorUserId).catch(() => undefined);
    }
  }

  return { created, skipped };
}

export async function upsertLogisticsScheduleEntry(
  data: ScheduleEntryWriteData & { sourceRef: ScheduleEntrySourceRef },
  actorUserId: Types.ObjectId
): Promise<IScheduleEntry> {
  await connectDB();
  const emp = await Employee.findById(data.employeeId).exec();
  if (!emp) throw new Error('Dolgoz? nem tal?lhat?.');

  const existing = await ScheduleEntry.findOne({
    employeeId: data.employeeId,
    'sourceRef.type': data.sourceRef.type,
    'sourceRef.jobId': data.sourceRef.jobId,
    'sourceRef.pickupId': data.sourceRef.pickupId,
    'sourceRef.leg': data.sourceRef.leg,
  }).exec();

  if (existing) {
    Object.assign(existing, {
      start: data.start,
      end: data.end,
      allDay: data.allDay,
      kind: data.kind,
      title: data.title,
      notes: data.notes,
      locationLabel: data.locationLabel,
      locationAddress: data.locationAddress,
      updatedBy: actorUserId,
    });
    await existing.save();
    return existing;
  }

  return ScheduleEntry.create({
    ...data,
    companyId: emp.companyId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
}

export async function removeLogisticsScheduleEntries(
  jobId: Types.ObjectId,
  pickupId?: Types.ObjectId,
  leg?: 'gather' | 'event'
): Promise<void> {
  await connectDB();
  const filter: Record<string, unknown> = {
    'sourceRef.type': 'logistics_pickup',
    'sourceRef.jobId': jobId,
  };
  if (pickupId) filter['sourceRef.pickupId'] = pickupId;
  if (leg) filter['sourceRef.leg'] = leg;
  await ScheduleEntry.deleteMany(filter).exec();
}
