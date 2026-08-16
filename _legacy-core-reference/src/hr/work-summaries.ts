import {
  connectDB,
  Employee,
  monthlyWorkSummaryRepository,
  type IMonthlyWorkSummary,
} from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';
import { suggestMonthlyFromSchedule } from './kimutatasok';

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

  const existing = await monthlyWorkSummaryRepository.findByEmployeeMonth(
    data.employeeId,
    data.year,
    data.month
  );

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

  return monthlyWorkSummaryRepository.create({
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
  return monthlyWorkSummaryRepository.findForPeriod(params);
}

/** @deprecated Use suggestMonthlyFromSchedule from kimutatasok */
export async function suggestWorkedHoursFromSchedule(
  employeeId: Types.ObjectId,
  year: number,
  month: number
): Promise<number> {
  const stats = await suggestMonthlyFromSchedule(employeeId, year, month);
  return stats.workedHours;
}

export { suggestMonthlyFromSchedule };
