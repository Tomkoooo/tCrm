import { connectDB, Employee, MonthlyWorkSummary, type IMonthlyWorkSummary } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';
import { suggestWorkedHoursFromSchedule } from './schedules';

export async function upsertMonthlyWorkSummary(
  data: {
    employeeId: Types.ObjectId;
    year: number;
    month: number;
    workedHours: number;
    holidayDays: number;
    sickDays: number;
    sickPayAmount?: number;
    notes?: string;
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IMonthlyWorkSummary> {
  await connectDB();
  const emp = await Employee.findById(data.employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);

  const existing = await MonthlyWorkSummary.findOne({
    employeeId: data.employeeId,
    year: data.year,
    month: data.month,
  }).exec();

  if (existing) {
    existing.workedHours = data.workedHours;
    existing.holidayDays = data.holidayDays;
    existing.sickDays = data.sickDays;
    existing.sickPayAmount = data.sickPayAmount;
    existing.notes = data.notes;
    existing.updatedBy = actorUserId;
    await existing.save();
    return existing;
  }

  return MonthlyWorkSummary.create({
    ...data,
    companyId: emp.companyId,
    updatedBy: actorUserId,
  });
}

export async function listMonthlySummaries(params: {
  year: number;
  month: number;
  companyId?: Types.ObjectId;
  allowedCompanyIds: Types.ObjectId[] | null;
}): Promise<IMonthlyWorkSummary[]> {
  await connectDB();
  const filter: Record<string, unknown> = {
    year: params.year,
    month: params.month,
  };
  if (params.companyId) filter.companyId = params.companyId;
  else if (params.allowedCompanyIds !== null) {
    if (!params.allowedCompanyIds.length) return [];
    filter.companyId = { $in: params.allowedCompanyIds };
  }
  return MonthlyWorkSummary.find(filter).sort({ employeeId: 1 }).exec();
}

export { suggestWorkedHoursFromSchedule };
