import {
  connectDB,
  Employee,
  ScheduleChangeRequest,
  ScheduleEntry,
  type IScheduleChangeRequest,
  type IScheduleEntry,
} from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { SCHEDULE_PLAN_MODULE, SCHEDULE_PLAN_REF_TYPE } from './schedule-plans';

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

/** A plan-owned shift is requestable regardless of the employee's schedule mode. */
function isPlanEntry(entry: IScheduleEntry): boolean {
  const ref = entry.sourceRef as { module?: string; refType?: string } | undefined;
  return ref?.module === SCHEDULE_PLAN_MODULE && ref.refType === SCHEDULE_PLAN_REF_TYPE;
}

export async function submitScheduleChangeRequest(params: {
  scheduleEntryId: Types.ObjectId | string;
  proposedStart: Date;
  proposedEnd: Date;
  note?: string;
  requestedBy: Types.ObjectId | string;
}): Promise<IScheduleChangeRequest> {
  await connectDB();
  if (!(params.proposedEnd > params.proposedStart)) {
    throw new Error('Érvénytelen javasolt időtartam.');
  }

  const entry = await ScheduleEntry.findById(toOid(params.scheduleEntryId)).exec();
  if (!entry) throw new Error('Bejegyzés nem található.');
  if (entry.kind !== 'shift' && entry.kind !== 'other') {
    throw new Error('Csak műszakra kérhető módosítás (nem logisztikai feladatra).');
  }

  const fromPlan = isPlanEntry(entry);

  const employee = await Employee.findById(entry.employeeId).exec();
  if (!employee) throw new Error('Dolgozó nem található.');
  if (!fromPlan && employee.scheduleMode !== 'roster') {
    throw new Error('Csak roster módú dolgozó kérhet műszakmódosítást.');
  }
  if (!employee.userId?.equals(toOid(params.requestedBy))) {
    throw new Error('Csak saját műszakra adható be kérelem.');
  }

  // One open request per shift, so the reviewer never sees competing proposals.
  const open = await ScheduleChangeRequest.findOne({
    scheduleEntryId: entry._id,
    status: 'pending',
  }).exec();
  if (open) throw new Error('Erre a műszakra már van elbírálásra váró kérelem.');

  return ScheduleChangeRequest.create({
    employeeId: employee._id,
    companyId: employee.companyId,
    scheduleEntryId: entry._id,
    status: 'pending',
    originalStart: entry.start,
    originalEnd: entry.end,
    proposedStart: params.proposedStart,
    proposedEnd: params.proposedEnd,
    note: params.note?.trim() || undefined,
    requestedBy: toOid(params.requestedBy),
  });
}

export async function cancelScheduleChangeRequest(
  id: Types.ObjectId | string,
  userId: Types.ObjectId | string
): Promise<IScheduleChangeRequest> {
  await connectDB();
  const doc = await ScheduleChangeRequest.findById(id);
  if (!doc) throw new Error('Kérelem nem található.');
  if (doc.status !== 'pending') throw new Error('Csak függő kérelem vonható vissza.');
  if (!doc.requestedBy.equals(toOid(userId))) throw new Error('Nincs jogosultság.');
  doc.status = 'cancelled';
  await doc.save();
  return doc;
}

export async function reviewScheduleChangeRequest(
  id: Types.ObjectId | string,
  decision: 'approved' | 'rejected',
  reviewerUserId: Types.ObjectId | string,
  reviewNote?: string
): Promise<IScheduleChangeRequest> {
  await connectDB();
  const doc = await ScheduleChangeRequest.findById(id);
  if (!doc) throw new Error('Kérelem nem található.');
  if (doc.status !== 'pending') throw new Error('A kérelem már elbírálva.');

  // Apply the shift change before recording the decision, so a failure here
  // leaves the request pending rather than "approved but not applied".
  if (decision === 'approved') {
    const entry = await ScheduleEntry.findById(doc.scheduleEntryId).exec();
    if (!entry || (entry.kind !== 'shift' && entry.kind !== 'other')) {
      throw new Error('A módosítandó műszak már nem elérhető.');
    }
    entry.start = doc.proposedStart;
    entry.end = doc.proposedEnd;
    entry.allDay = false;
    entry.updatedBy = toOid(reviewerUserId);
    await entry.save();
  }

  doc.status = decision;
  doc.reviewedBy = toOid(reviewerUserId);
  doc.reviewedAt = new Date();
  doc.reviewNote = reviewNote?.trim() || undefined;
  await doc.save();

  return doc;
}

export async function listScheduleChangeRequests(options?: {
  status?: string;
  employeeId?: Types.ObjectId | string;
  employeeIds?: Array<Types.ObjectId | string>;
  companyId?: Types.ObjectId | string;
  scheduleEntryIds?: Array<Types.ObjectId | string>;
}): Promise<IScheduleChangeRequest[]> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (options?.status) filter.status = options.status;
  if (options?.employeeId) filter.employeeId = toOid(options.employeeId);
  else if (options?.employeeIds?.length) {
    filter.employeeId = { $in: options.employeeIds.map(toOid) };
  }
  if (options?.companyId) filter.companyId = toOid(options.companyId);
  if (options?.scheduleEntryIds?.length) {
    filter.scheduleEntryId = { $in: options.scheduleEntryIds.map(toOid) };
  }
  return ScheduleChangeRequest.find(filter).sort({ createdAt: -1 }).limit(200).exec();
}

/** Change requests raised against a plan's own shifts. */
export async function listPlanChangeRequests(
  planId: Types.ObjectId | string
): Promise<IScheduleChangeRequest[]> {
  await connectDB();
  const entries = await ScheduleEntry.find({
    'sourceRef.module': SCHEDULE_PLAN_MODULE,
    'sourceRef.refType': SCHEDULE_PLAN_REF_TYPE,
    'sourceRef.refId': toOid(planId),
  })
    .select({ _id: 1 })
    .lean()
    .exec();

  if (!entries.length) return [];
  return listScheduleChangeRequests({ scheduleEntryIds: entries.map((e) => e._id) });
}
