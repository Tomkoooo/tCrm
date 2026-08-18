import { connectDB, Employee, EmployeeLeaveYear, type IEmployeeLeaveYear } from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export async function upsertEmployeeLeaveYear(params: {
  employeeId: Types.ObjectId | string;
  year: number;
  entitlementDays: number;
  updatedBy: Types.ObjectId | string;
  notes?: string;
}): Promise<IEmployeeLeaveYear> {
  await connectDB();
  const employee = await Employee.findById(toOid(params.employeeId)).exec();
  if (!employee) throw new Error('Dolgozó nem található.');

  const existing = await EmployeeLeaveYear.findOne({
    employeeId: employee._id,
    year: params.year,
  }).exec();

  if (existing) {
    existing.entitlementDays = params.entitlementDays;
    existing.notes = params.notes?.trim() || undefined;
    existing.updatedBy = toOid(params.updatedBy);
    existing.companyId = employee.companyId;
    await existing.save();
    return existing;
  }

  return EmployeeLeaveYear.create({
    employeeId: employee._id,
    companyId: employee.companyId,
    year: params.year,
    entitlementDays: params.entitlementDays,
    notes: params.notes?.trim() || undefined,
    updatedBy: toOid(params.updatedBy),
  });
}

export async function getLeaveYear(
  employeeId: Types.ObjectId | string,
  year: number
): Promise<IEmployeeLeaveYear | null> {
  await connectDB();
  return EmployeeLeaveYear.findOne({
    employeeId: toOid(employeeId),
    year,
  }).exec();
}

export async function listLeaveYears(params: {
  year: number;
  companyId?: Types.ObjectId | string;
  employeeIds?: Array<Types.ObjectId | string>;
}): Promise<IEmployeeLeaveYear[]> {
  await connectDB();
  const filter: Record<string, unknown> = { year: params.year };
  if (params.companyId) filter.companyId = toOid(params.companyId);
  if (params.employeeIds?.length) {
    filter.employeeId = { $in: params.employeeIds.map(toOid) };
  }
  return EmployeeLeaveYear.find(filter).exec();
}
