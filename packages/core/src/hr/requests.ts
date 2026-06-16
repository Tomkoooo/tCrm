import {
  connectDB,
  Employee,
  HrRequest,
  ScheduleEntry,
  MonthlyWorkSummary,
  type IHrRequest,
  type HrRequestType,
} from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';
import { splitDayCountByMonth } from '@crm/lib';

export async function submitHrRequest(
  employeeId: Types.ObjectId,
  requestedByUserId: Types.ObjectId,
  data: {
    type: HrRequestType;
    startDate?: Date;
    endDate?: Date;
    reason?: string;
    sickPayAmount?: number;
    scheduleEntryId?: Types.ObjectId;
    proposedStart?: Date;
    proposedEnd?: Date;
  }
): Promise<IHrRequest> {
  await connectDB();
  const emp = await Employee.findById(employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  if (!emp.userId?.equals(requestedByUserId)) {
    throw new Error('Csak saját kérelmet adhat be.');
  }

  let payload: IHrRequest['payload'] = {
    startDate: data.startDate,
    endDate: data.endDate,
    reason: data.reason,
    sickPayAmount: data.sickPayAmount,
    scheduleEntryId: data.scheduleEntryId,
    proposedStart: data.proposedStart,
    proposedEnd: data.proposedEnd,
  };

  if (data.type === 'schedule_change') {
    if (!data.scheduleEntryId) {
      throw new Error('Válasszon módosítandó műszakot.');
    }
    if (!data.proposedStart || !data.proposedEnd) {
      throw new Error('Adja meg a javasolt időpontokat.');
    }
    const entry = await ScheduleEntry.findById(data.scheduleEntryId).exec();
    if (!entry || !entry.employeeId.equals(employeeId)) {
      throw new Error('A kiválasztott műszak nem található.');
    }
    payload = {
      ...payload,
      originalStart: entry.start,
      originalEnd: entry.end,
      originalTitle: entry.title,
    };
  }

  return HrRequest.create({
    employeeId,
    companyId: emp.companyId,
    type: data.type,
    status: 'pending',
    requestedByUserId,
    payload,
  });
}

export async function cancelHrRequest(
  requestId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<IHrRequest> {
  await connectDB();
  const req = await HrRequest.findById(requestId).exec();
  if (!req) throw new Error('Kérelem nem található.');
  if (req.status !== 'pending') throw new Error('Csak függő kérelmet lehet visszavonni.');
  if (!req.requestedByUserId.equals(userId)) {
    throw new Error('Nincs jogosultság.');
  }
  req.status = 'cancelled';
  await req.save();
  return req;
}

export async function reviewHrRequest(
  requestId: Types.ObjectId,
  approve: boolean,
  reviewerUserId: Types.ObjectId,
  permissions: string[],
  reviewNote?: string
): Promise<IHrRequest> {
  await connectDB();
  const req = await HrRequest.findById(requestId).exec();
  if (!req) throw new Error('Kérelem nem található.');
  if (req.status !== 'pending') throw new Error('A kérelem már elbírálásra került.');
  await assertCompanyInScope(req.companyId, reviewerUserId, permissions);
  if (req.requestedByUserId.equals(reviewerUserId)) {
    throw new Error('Saját kérelmet nem lehet jóváhagyni.');
  }

  req.status = approve ? 'approved' : 'rejected';
  req.reviewedByUserId = reviewerUserId;
  req.reviewedAt = new Date();
  req.reviewNote = reviewNote;
  await req.save();

  if (approve) {
    await applyApprovedRequest(req, reviewerUserId);
  }
  return req;
}

async function applyApprovedRequest(
  req: IHrRequest,
  reviewerUserId: Types.ObjectId
): Promise<void> {
  const { type, payload, employeeId, companyId } = req;

  if (type === 'holiday' || type === 'sick_leave') {
    const start = payload.startDate;
    const end = payload.endDate;
    if (start && end) {
      await ScheduleEntry.create({
        employeeId,
        companyId,
        start,
        end: new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1),
        allDay: true,
        kind: 'off',
        title: type === 'holiday' ? 'Szabadság' : 'Betegszabadság',
        createdBy: reviewerUserId,
        updatedBy: reviewerUserId,
      });

      const daySplits = splitDayCountByMonth(start, end);
      for (const split of daySplits) {
        const summary = await MonthlyWorkSummary.findOne({
          employeeId,
          year: split.year,
          month: split.month,
        }).exec();

        if (type === 'holiday') {
          if (summary) {
            summary.holidayDays += split.days;
            summary.updatedBy = reviewerUserId;
            await summary.save();
          } else {
            await MonthlyWorkSummary.create({
              employeeId,
              companyId,
              year: split.year,
              month: split.month,
              workedHours: 0,
              holidayDays: split.days,
              sickDays: 0,
              updatedBy: reviewerUserId,
            });
          }
        } else {
          const sickPay = split.month === start.getMonth() + 1 ? payload.sickPayAmount : undefined;
          if (summary) {
            summary.sickDays += split.days;
            if (sickPay != null) summary.sickPayAmount = (summary.sickPayAmount ?? 0) + sickPay;
            summary.updatedBy = reviewerUserId;
            await summary.save();
          } else {
            await MonthlyWorkSummary.create({
              employeeId,
              companyId,
              year: split.year,
              month: split.month,
              workedHours: 0,
              holidayDays: 0,
              sickDays: split.days,
              sickPayAmount: sickPay,
              updatedBy: reviewerUserId,
            });
          }
        }
      }
    }
  }

  if (type === 'schedule_change' && payload.proposedStart && payload.proposedEnd) {
    if (payload.scheduleEntryId) {
      const entry = await ScheduleEntry.findById(payload.scheduleEntryId).exec();
      if (entry) {
        entry.start = payload.proposedStart;
        entry.end = payload.proposedEnd;
        entry.updatedBy = reviewerUserId;
        await entry.save();
      }
    } else {
      await ScheduleEntry.create({
        employeeId,
        companyId,
        start: payload.proposedStart,
        end: payload.proposedEnd,
        kind: 'shift',
        title: 'Módosított beosztás',
        createdBy: reviewerUserId,
        updatedBy: reviewerUserId,
      });
    }
  }
}

export async function countPendingRequests(
  allowedCompanyIds: Types.ObjectId[] | null
): Promise<number> {
  await connectDB();
  const filter: Record<string, unknown> = { status: 'pending' };
  if (allowedCompanyIds !== null) {
    if (!allowedCompanyIds.length) return 0;
    filter.companyId = { $in: allowedCompanyIds };
  }
  return HrRequest.countDocuments(filter).exec();
}
