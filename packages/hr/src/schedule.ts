import {
  connectDB,
  Employee,
  ScheduleEntry,
  type IScheduleEntry,
  type ScheduleEntryKind,
} from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export async function listScheduleEntries(params: {
  start: Date;
  end: Date;
  employeeId?: Types.ObjectId | string;
  employeeIds?: Array<Types.ObjectId | string>;
  companyId?: Types.ObjectId | string;
  kind?: ScheduleEntryKind;
}): Promise<IScheduleEntry[]> {
  await connectDB();
  const filter: Record<string, unknown> = {
    start: { $lt: params.end },
    end: { $gt: params.start },
  };
  if (params.employeeId) filter.employeeId = toOid(params.employeeId);
  else if (params.employeeIds?.length) {
    filter.employeeId = { $in: params.employeeIds.map(toOid) };
  }
  if (params.companyId) filter.companyId = toOid(params.companyId);
  if (params.kind) filter.kind = params.kind;
  return ScheduleEntry.find(filter).sort({ start: 1 }).exec();
}

export async function listScheduleBySourceRef(
  module: string,
  refType: string,
  refId: Types.ObjectId | string
): Promise<IScheduleEntry[]> {
  await connectDB();
  return ScheduleEntry.find({
    'sourceRef.module': module,
    'sourceRef.refType': refType,
    'sourceRef.refId': toOid(refId),
  })
    .sort({ start: 1 })
    .exec();
}

export async function removeScheduleBySourceRef(
  module: string,
  refType: string,
  refId: Types.ObjectId | string
): Promise<number> {
  await connectDB();
  const result = await ScheduleEntry.deleteMany({
    'sourceRef.module': module,
    'sourceRef.refType': refType,
    'sourceRef.refId': toOid(refId),
  }).exec();
  return result.deletedCount ?? 0;
}

export type UpsertJobScheduleParams = {
  employeeId: Types.ObjectId | string;
  start: Date;
  end: Date;
  title: string;
  notes?: string;
  pickupId?: Types.ObjectId | string;
  jobId?: Types.ObjectId | string;
  role?: string;
  actorUserId: Types.ObjectId | string;
};

export async function upsertJobScheduleEntry(
  params: UpsertJobScheduleParams
): Promise<IScheduleEntry> {
  await connectDB();
  const refType = params.pickupId ? 'pickup' : 'job';
  const refId = toOid(params.pickupId ?? params.jobId ?? '');
  if (!refId) throw new Error('pickupId or jobId is required');
  const actor = toOid(params.actorUserId);
  const employeeOid = toOid(params.employeeId);
  const employee = await Employee.findById(employeeOid).select({ companyId: 1 }).lean().exec();
  if (!employee?.companyId) throw new Error('Dolgozó vagy cég hiányzik a beosztáshoz.');

  const filter: Record<string, unknown> = {
    'sourceRef.module': 'logistics',
    'sourceRef.refType': refType,
    'sourceRef.refId': refId,
    employeeId: employeeOid,
  };
  if (params.role) filter.role = params.role;

  const existing = await ScheduleEntry.findOne(filter).exec();

  if (existing) {
    existing.start = params.start;
    existing.end = params.end;
    existing.title = params.title;
    existing.notes = params.notes;
    existing.role = params.role;
    existing.companyId = employee.companyId;
    existing.updatedBy = actor;
    await existing.save();
    return existing;
  }

  return ScheduleEntry.create({
    employeeId: employeeOid,
    companyId: employee.companyId,
    start: params.start,
    end: params.end,
    kind: 'job',
    role: params.role,
    title: params.title,
    notes: params.notes,
    sourceRef: {
      module: 'logistics',
      refType,
      refId,
      label: params.title,
      ...(params.jobId && params.pickupId ? { jobId: toOid(params.jobId) } : {}),
    },
    createdBy: actor,
    updatedBy: actor,
  });
}

export type UpsertRosterShiftParams = {
  id?: Types.ObjectId | string;
  employeeId: Types.ObjectId | string;
  start: Date;
  end: Date;
  kind?: 'shift' | 'other';
  title?: string;
  notes?: string;
  actorUserId: Types.ObjectId | string;
};

export async function upsertRosterShift(params: UpsertRosterShiftParams): Promise<IScheduleEntry> {
  await connectDB();
  const employee = await Employee.findById(toOid(params.employeeId)).exec();
  if (!employee) throw new Error('Dolgozó nem található.');
  if (employee.scheduleMode !== 'roster') {
    throw new Error('Csak roster módú dolgozónál szerkeszthető műszak.');
  }
  if (!(params.end > params.start)) throw new Error('Érvénytelen időtartam.');

  const actor = toOid(params.actorUserId);
  const kind = params.kind ?? 'shift';
  const title = params.title?.trim() || (kind === 'other' ? 'Egyéb' : 'Műszak');

  if (params.id) {
    const existing = await ScheduleEntry.findById(toOid(params.id)).exec();
    if (!existing) throw new Error('Bejegyzés nem található.');
    if (existing.kind === 'job' || existing.kind === 'off') {
      throw new Error('Logisztikai / távollét bejegyzés nem szerkeszthető innen.');
    }
    if (!existing.employeeId.equals(employee._id)) {
      throw new Error('A bejegyzés nem ehhez a dolgozóhoz tartozik.');
    }
    existing.start = params.start;
    existing.end = params.end;
    existing.kind = kind;
    existing.title = title;
    existing.notes = params.notes?.trim() || undefined;
    existing.companyId = employee.companyId;
    existing.updatedBy = actor;
    await existing.save();
    return existing;
  }

  return ScheduleEntry.create({
    employeeId: employee._id,
    companyId: employee.companyId,
    start: params.start,
    end: params.end,
    kind,
    title,
    notes: params.notes?.trim() || undefined,
    createdBy: actor,
    updatedBy: actor,
  });
}

export async function deleteRosterShift(
  id: Types.ObjectId | string,
  actorUserId: Types.ObjectId | string
): Promise<void> {
  await connectDB();
  const entry = await ScheduleEntry.findById(toOid(id)).exec();
  if (!entry) throw new Error('Bejegyzés nem található.');
  if (entry.kind !== 'shift' && entry.kind !== 'other') {
    throw new Error('Csak roster műszak törölhető.');
  }
  void actorUserId;
  await entry.deleteOne();
}
