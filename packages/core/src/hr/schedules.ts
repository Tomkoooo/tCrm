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

export async function suggestWorkedHoursFromSchedule(
  employeeId: Types.ObjectId,
  year: number,
  month: number
): Promise<number> {
  await connectDB();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const entries = await ScheduleEntry.find({
    employeeId,
    kind: 'shift',
    start: { $gte: start, $lt: end },
  })
    .lean()
    .exec();
  let totalMs = 0;
  for (const e of entries) {
    const s = new Date(e.start).getTime();
    const en = new Date(e.end).getTime();
    if (en > s) totalMs += en - s;
  }
  return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
}
