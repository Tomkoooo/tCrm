import { eachDayInRange, isWorkday, combineHrDayAndTime } from '@crm/lib';
import { connectDB, Employee, ScheduleEntry, type IScheduleEntry } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';

export async function listScheduleEntries(params: {
  start: Date;
  end: Date;
  employeeId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  allowedCompanyIds: Types.ObjectId[] | null;
}): Promise<IScheduleEntry[]> {
  await connectDB();
  const filter: Record<string, unknown> = {
    start: { $lt: params.end },
    end: { $gt: params.start },
  };
  if (params.employeeId) filter.employeeId = params.employeeId;
  if (params.companyId) filter.companyId = params.companyId;
  else if (params.allowedCompanyIds !== null) {
    if (!params.allowedCompanyIds.length) return [];
    filter.companyId = { $in: params.allowedCompanyIds };
  }
  return ScheduleEntry.find(filter).sort({ start: 1 }).exec();
}

export async function createScheduleEntry(
  data: {
    employeeId: Types.ObjectId;
    start: Date;
    end: Date;
    allDay?: boolean;
    kind: 'shift' | 'off' | 'training' | 'other';
    title?: string;
    notes?: string;
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IScheduleEntry> {
  await connectDB();
  const emp = await Employee.findById(data.employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);
  return ScheduleEntry.create({
    ...data,
    companyId: emp.companyId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
}

export async function updateScheduleEntry(
  id: Types.ObjectId,
  data: Partial<{
    start: Date;
    end: Date;
    allDay?: boolean;
    kind: 'shift' | 'off' | 'training' | 'other';
    title?: string;
    notes?: string;
  }>,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IScheduleEntry> {
  await connectDB();
  const entry = await ScheduleEntry.findById(id).exec();
  if (!entry) throw new Error('Beosztás nem található.');
  await assertCompanyInScope(entry.companyId, actorUserId, permissions);
  Object.assign(entry, data, { updatedBy: actorUserId });
  await entry.save();
  return entry;
}

export async function deleteScheduleEntry(
  id: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<void> {
  await connectDB();
  const entry = await ScheduleEntry.findById(id).exec();
  if (!entry) throw new Error('Beosztás nem található.');
  await assertCompanyInScope(entry.companyId, actorUserId, permissions);
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
    mode: 'workdays' | 'selected_dates';
    selectedDates?: Date[];
    skipExisting?: boolean;
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<{ created: number; skipped: number }> {
  await connectDB();
  let created = 0;
  let skipped = 0;

  const targetDays: Date[] =
    data.mode === 'selected_dates' && data.selectedDates?.length
      ? data.selectedDates
      : eachDayInRange(data.startDate, data.endDate).filter((d) => isWorkday(d));

  for (const employeeId of data.employeeIds) {
    const emp = await Employee.findById(employeeId).exec();
    if (!emp) continue;
    await assertCompanyInScope(emp.companyId, actorUserId, permissions);

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

      await ScheduleEntry.create({
        employeeId,
        companyId: emp.companyId,
        start,
        end,
        kind: 'shift',
        title: 'Műszak',
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });
      existingEntries.push({ start, end, kind: 'shift' });
      created++;
    }
  }

  return { created, skipped };
}
