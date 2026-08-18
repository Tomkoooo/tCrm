import {
  connectDB,
  Employee,
  ScheduleChangeRequest,
  ScheduleEntry,
  type IScheduleChangeRequest,
} from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
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
    throw new Error('Csak roster műszakra kérhető módosítás (nem logisztikai feladatra).');
  }

  const employee = await Employee.findById(entry.employeeId).exec();
  if (!employee) throw new Error('Dolgozó nem található.');
  if (employee.scheduleMode !== 'roster') {
    throw new Error('Csak roster módú dolgozó kérhet műszakmódosítást.');
  }
  if (!employee.userId?.equals(toOid(params.requestedBy))) {
    throw new Error('Csak saját műszakra adható be kérelem.');
  }

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
  reviewerUserId: Types.ObjectId | string
): Promise<IScheduleChangeRequest> {
  await connectDB();
  const doc = await ScheduleChangeRequest.findById(id);
  if (!doc) throw new Error('Kérelem nem található.');
  if (doc.status !== 'pending') throw new Error('A kérelem már elbírálva.');

  doc.status = decision;
  doc.reviewedBy = toOid(reviewerUserId);
  doc.reviewedAt = new Date();
  await doc.save();

  if (decision === 'approved') {
    const entry = await ScheduleEntry.findById(doc.scheduleEntryId).exec();
    if (!entry || (entry.kind !== 'shift' && entry.kind !== 'other')) {
      throw new Error('A módosítandó műszak már nem elérhető.');
    }
    entry.start = doc.proposedStart;
    entry.end = doc.proposedEnd;
    entry.updatedBy = toOid(reviewerUserId);
    await entry.save();
  }

  return doc;
}

export async function listScheduleChangeRequests(options?: {
  status?: string;
  employeeId?: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
}): Promise<IScheduleChangeRequest[]> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (options?.status) filter.status = options.status;
  if (options?.employeeId) filter.employeeId = toOid(options.employeeId);
  if (options?.companyId) filter.companyId = toOid(options.companyId);
  return ScheduleChangeRequest.find(filter).sort({ createdAt: -1 }).limit(200).exec();
}
