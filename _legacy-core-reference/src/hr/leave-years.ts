import { connectDB, employeeLeaveYearRepository, type IEmployeeLeaveYear } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';

export async function upsertEmployeeLeaveYear(
  employeeId: Types.ObjectId,
  companyId: Types.ObjectId,
  year: number,
  entitlementDays: number,
  updatedBy: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[],
  notes?: string
): Promise<IEmployeeLeaveYear> {
  await connectDB();
  await assertCompanyInScope(companyId, actorUserId, permissions);

  const existing = await employeeLeaveYearRepository.findOne({ employeeId, year });
  if (existing) {
    existing.entitlementDays = entitlementDays;
    existing.notes = notes;
    existing.updatedBy = updatedBy;
    await existing.save();
    return existing;
  }

  return employeeLeaveYearRepository.create({
    employeeId,
    companyId,
    year,
    entitlementDays,
    notes,
    updatedBy,
  });
}

export async function listEmployeeLeaveYears(
  filter: {
    year: number;
    companyId?: Types.ObjectId;
    employeeIds?: Types.ObjectId[];
  },
  allowedCompanyIds: Types.ObjectId[] | null
): Promise<IEmployeeLeaveYear[]> {
  await connectDB();
  return employeeLeaveYearRepository.findForYear({
    ...filter,
    allowedCompanyIds,
  });
}
