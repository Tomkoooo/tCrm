import { connectDB, Employee, User, type EmployeeScheduleMode, type IEmployee } from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { ensureDefaultCompany } from './companies';

export type CreateEmployeeParams = {
  companyId: Types.ObjectId | string;
  name: string;
  email?: string;
  phone?: string;
  userId?: Types.ObjectId | string;
  scheduleMode?: EmployeeScheduleMode;
  calendarColor?: string;
  isActive?: boolean;
  notes?: string;
};

export type UpdateEmployeeParams = Partial<CreateEmployeeParams>;

function toOid(id: Types.ObjectId | string | undefined): Types.ObjectId | undefined {
  if (!id) return undefined;
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export async function createEmployee(params: CreateEmployeeParams): Promise<IEmployee> {
  await connectDB();
  await ensureDefaultCompany();
  return Employee.create({
    companyId: toOid(params.companyId)!,
    name: params.name.trim(),
    email: params.email?.trim().toLowerCase() || undefined,
    phone: params.phone?.trim() || undefined,
    userId: toOid(params.userId),
    scheduleMode: params.scheduleMode ?? 'logistics',
    calendarColor: params.calendarColor?.trim() || undefined,
    isActive: params.isActive ?? true,
    notes: params.notes?.trim() || undefined,
  });
}

export async function updateEmployee(
  id: Types.ObjectId | string,
  params: UpdateEmployeeParams
): Promise<IEmployee> {
  await connectDB();
  const employee = await Employee.findById(id);
  if (!employee) throw new Error('Dolgozó nem található.');

  if (params.companyId !== undefined) employee.companyId = toOid(params.companyId)!;
  if (params.name !== undefined) employee.name = params.name.trim();
  if (params.email !== undefined) {
    employee.email = params.email.trim() ? params.email.trim().toLowerCase() : undefined;
  }
  if (params.phone !== undefined) {
    employee.phone = params.phone.trim() || undefined;
  }
  if (params.userId !== undefined) {
    employee.userId =
      params.userId === '' || params.userId == null ? undefined : toOid(params.userId);
  }
  if (params.scheduleMode !== undefined) employee.scheduleMode = params.scheduleMode;
  if (params.calendarColor !== undefined) {
    employee.calendarColor = params.calendarColor.trim() || undefined;
  }
  if (params.isActive !== undefined) employee.isActive = params.isActive;
  if (params.notes !== undefined) {
    employee.notes = params.notes.trim() || undefined;
  }

  await employee.save();
  return employee;
}

export async function getEmployeeById(id: Types.ObjectId | string): Promise<IEmployee | null> {
  await connectDB();
  return Employee.findById(id).exec();
}

export async function listEmployees(options?: {
  activeOnly?: boolean;
  companyId?: Types.ObjectId | string;
  query?: string;
  limit?: number;
}): Promise<IEmployee[]> {
  await connectDB();
  await ensureDefaultCompany();
  const filter: Record<string, unknown> = {};
  if (options?.activeOnly !== false) filter.isActive = true;
  if (options?.companyId) filter.companyId = toOid(options.companyId);

  const q = options?.query?.trim();
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  return Employee.find(filter)
    .sort({ name: 1 })
    .limit(options?.limit ?? 500)
    .exec();
}

/** Resolve active membership: User.activeEmployeeId if valid, else first active Employee. */
export async function getEmployeeForUser(
  userId: Types.ObjectId | string
): Promise<IEmployee | null> {
  await connectDB();
  const oid = toOid(userId);
  if (!oid) return null;

  const user = await User.findById(oid).select({ activeEmployeeId: 1 }).lean().exec();
  if (user?.activeEmployeeId) {
    const active = await Employee.findOne({
      _id: user.activeEmployeeId,
      userId: oid,
      isActive: true,
    }).exec();
    if (active) return active;
  }

  return Employee.findOne({ userId: oid, isActive: true }).sort({ name: 1 }).exec();
}

export async function listMembershipsForUser(
  userId: Types.ObjectId | string
): Promise<IEmployee[]> {
  await connectDB();
  const oid = toOid(userId);
  if (!oid) return [];
  return Employee.find({ userId: oid, isActive: true }).sort({ name: 1 }).exec();
}

/** True when the CRM user has at least one active employee membership. */
export async function userHasEmployeeProfile(userId: Types.ObjectId | string): Promise<boolean> {
  await connectDB();
  const oid = toOid(userId);
  if (!oid) return false;
  return Boolean(await Employee.exists({ userId: oid, isActive: true }));
}

export async function userOwnsEmployee(
  userId: Types.ObjectId | string,
  employeeId: Types.ObjectId | string
): Promise<boolean> {
  await connectDB();
  const uOid = toOid(userId);
  const eOid = toOid(employeeId);
  if (!uOid || !eOid) return false;
  return Boolean(await Employee.exists({ _id: eOid, userId: uOid, isActive: true }));
}

export async function setActiveEmployeeForUser(
  userId: Types.ObjectId | string,
  employeeId: Types.ObjectId | string
): Promise<void> {
  await connectDB();
  const uOid = toOid(userId)!;
  const eOid = toOid(employeeId)!;
  const emp = await Employee.findOne({ _id: eOid, userId: uOid, isActive: true }).exec();
  if (!emp) throw new Error('Érvénytelen dolgozó tagság.');
  await User.updateOne({ _id: uOid }, { $set: { activeEmployeeId: eOid } }).exec();
}

/** Clone contact fields into another company (new membership). */
export async function addEmployeeToCompany(params: {
  sourceEmployeeId: Types.ObjectId | string;
  targetCompanyId: Types.ObjectId | string;
  scheduleMode?: EmployeeScheduleMode;
}): Promise<IEmployee> {
  await connectDB();
  const source = await Employee.findById(toOid(params.sourceEmployeeId));
  if (!source) throw new Error('Forrás dolgozó nem található.');
  const targetCompanyId = toOid(params.targetCompanyId)!;
  if (source.companyId.equals(targetCompanyId)) {
    throw new Error('A dolgozó már ebben a cégben van.');
  }
  if (source.userId) {
    const existing = await Employee.findOne({
      userId: source.userId,
      companyId: targetCompanyId,
    }).lean();
    if (existing) throw new Error('Ehhez a CRM fiókhoz már van tagság ebben a cégben.');
  }
  return Employee.create({
    companyId: targetCompanyId,
    name: source.name,
    email: source.email,
    phone: source.phone,
    userId: source.userId,
    scheduleMode: params.scheduleMode ?? source.scheduleMode,
    calendarColor: source.calendarColor,
    isActive: true,
    notes: source.notes,
  });
}

export async function listSiblingMemberships(
  employeeId: Types.ObjectId | string
): Promise<IEmployee[]> {
  await connectDB();
  const emp = await Employee.findById(toOid(employeeId)).lean().exec();
  if (!emp?.userId) return [];
  return Employee.find({ userId: emp.userId, _id: { $ne: emp._id } })
    .sort({ name: 1 })
    .exec();
}

export async function resolveUserIdsFromEmployees(
  employeeIds: Array<Types.ObjectId | string>
): Promise<Types.ObjectId[]> {
  await connectDB();
  if (!employeeIds.length) return [];
  const oids = employeeIds.map((id) => toOid(id)!).filter(Boolean);
  const employees = await Employee.find({ _id: { $in: oids } })
    .select({ userId: 1 })
    .lean()
    .exec();
  return employees.map((e) => e.userId).filter((id): id is Types.ObjectId => Boolean(id));
}
