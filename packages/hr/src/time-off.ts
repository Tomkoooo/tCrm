import {
  connectDB,
  Employee,
  ScheduleEntry,
  TimeOff,
  type IScheduleEntry,
  type ITimeOff,
  type TimeOffStatus,
  type TimeOffType,
} from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

export type CreateTimeOffParams = {
  employeeId: Types.ObjectId | string;
  type: TimeOffType;
  start: Date;
  end: Date;
  note?: string;
  requestedBy?: Types.ObjectId | string;
  autoApprove?: boolean;
};

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

function assertRange(start: Date, end: Date): void {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    throw new Error('Érvénytelen kezdő dátum.');
  }
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) {
    throw new Error('Érvénytelen záró dátum.');
  }
  if (end < start) {
    throw new Error('A záró dátum nem lehet korábbi a kezdőnél.');
  }
}

export async function createTimeOffRequest(params: CreateTimeOffParams): Promise<ITimeOff> {
  await connectDB();
  assertRange(params.start, params.end);

  const employee = await Employee.findById(toOid(params.employeeId)).exec();
  if (!employee) throw new Error('Dolgozó nem található.');

  const status: TimeOffStatus = params.autoApprove ? 'approved' : 'pending';
  const doc = await TimeOff.create({
    employeeId: employee._id,
    companyId: employee.companyId,
    type: params.type,
    status,
    start: params.start,
    end: params.end,
    note: params.note?.trim() || undefined,
    requestedBy: params.requestedBy ? toOid(params.requestedBy) : undefined,
    reviewedBy: params.autoApprove && params.requestedBy ? toOid(params.requestedBy) : undefined,
    reviewedAt: params.autoApprove ? new Date() : undefined,
  });

  if (status === 'approved') {
    await syncTimeOffScheduleEntry(
      doc,
      params.requestedBy ? toOid(params.requestedBy) : employee._id
    );
  }

  return doc;
}

export async function reviewTimeOff(
  id: Types.ObjectId | string,
  decision: 'approved' | 'rejected',
  reviewerUserId: Types.ObjectId | string
): Promise<ITimeOff> {
  await connectDB();
  const doc = await TimeOff.findById(id);
  if (!doc) throw new Error('Kérelem nem található.');
  if (doc.status !== 'pending') throw new Error('A kérelem már elbírálva.');

  doc.status = decision;
  doc.reviewedBy = toOid(reviewerUserId);
  doc.reviewedAt = new Date();
  await doc.save();

  if (decision === 'approved') {
    await syncTimeOffScheduleEntry(doc, toOid(reviewerUserId));
  }

  return doc;
}

export async function cancelTimeOffRequest(
  id: Types.ObjectId | string,
  userId: Types.ObjectId | string
): Promise<ITimeOff> {
  await connectDB();
  const doc = await TimeOff.findById(id);
  if (!doc) throw new Error('Kérelem nem található.');
  if (doc.status !== 'pending') throw new Error('Csak függő kérelem vonható vissza.');
  if (!doc.requestedBy?.equals(toOid(userId))) {
    throw new Error('Nincs jogosultság.');
  }
  doc.status = 'cancelled';
  await doc.save();
  return doc;
}

async function syncTimeOffScheduleEntry(
  timeOff: ITimeOff,
  actorUserId: Types.ObjectId
): Promise<IScheduleEntry> {
  const label = timeOff.type === 'sick' ? 'Betegszabadság' : 'Szabadság';
  const existing = await ScheduleEntry.findOne({
    'sourceRef.module': 'hr',
    'sourceRef.refType': 'time_off',
    'sourceRef.refId': timeOff._id,
  }).exec();

  if (existing) {
    existing.start = timeOff.start;
    existing.end = timeOff.end;
    existing.title = label;
    existing.notes = timeOff.note;
    existing.companyId = timeOff.companyId;
    existing.updatedBy = actorUserId;
    await existing.save();
    return existing;
  }

  return ScheduleEntry.create({
    employeeId: timeOff.employeeId,
    companyId: timeOff.companyId,
    start: timeOff.start,
    end: timeOff.end,
    kind: 'off',
    title: label,
    notes: timeOff.note,
    sourceRef: {
      module: 'hr',
      refType: 'time_off',
      refId: timeOff._id,
      label,
    },
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
}

export async function listTimeOff(options?: {
  status?: TimeOffStatus;
  employeeId?: Types.ObjectId | string;
  employeeIds?: Array<Types.ObjectId | string>;
  companyId?: Types.ObjectId | string;
  start?: Date;
  end?: Date;
}): Promise<ITimeOff[]> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (options?.status) filter.status = options.status;
  if (options?.employeeId) filter.employeeId = toOid(options.employeeId);
  else if (options?.employeeIds?.length) {
    filter.employeeId = { $in: options.employeeIds.map(toOid) };
  }
  if (options?.companyId) filter.companyId = toOid(options.companyId);
  if (options?.start && options?.end) {
    filter.start = { $lt: options.end };
    filter.end = { $gt: options.start };
  }
  return TimeOff.find(filter).sort({ start: -1 }).limit(500).exec();
}

export async function getApprovedTimeOffOverlapping(
  employeeId: Types.ObjectId | string,
  start: Date,
  end: Date
): Promise<ITimeOff[]> {
  await connectDB();
  return TimeOff.find({
    employeeId: toOid(employeeId),
    status: 'approved',
    start: { $lt: end },
    end: { $gt: start },
  })
    .lean()
    .exec();
}
