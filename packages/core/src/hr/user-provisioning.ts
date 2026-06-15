import bcrypt from 'bcryptjs';
import { connectDB, Employee, Role, User, type IEmployee, type IUser } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';

async function ensureEmployeeRoleForUser(user: IUser): Promise<void> {
  const employeeRole = await Role.findOne({ key: 'employee' }).exec();
  if (!employeeRole) return;
  const hasRole = user.roleIds.some((id) => id.equals(employeeRole._id));
  if (!hasRole) {
    user.roleIds.push(employeeRole._id);
    await user.save();
  }
}

export type EmployeeProfileInput = {
  companyId: Types.ObjectId;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  hrNotes?: string;
};

export type ProvisionUserInput = {
  name: string;
  email: string;
  password: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys?: string[];
  isActive?: boolean;
  employee?: EmployeeProfileInput;
  /** Skip HR company scope (admin user UI, public register). */
  skipCompanyScope?: boolean;
  actorUserId?: Types.ObjectId;
  actorPermissions?: string[];
};

async function ensureEmployeeRole(roleIds: Types.ObjectId[]): Promise<Types.ObjectId[]> {
  const employeeRole = await Role.findOne({ key: 'employee' }).exec();
  if (!employeeRole) return roleIds;
  if (roleIds.some((id) => id.equals(employeeRole._id))) return roleIds;
  return [...roleIds, employeeRole._id];
}

export async function provisionUserWithEmployee(
  input: ProvisionUserInput
): Promise<{ user: IUser; employee?: IEmployee }> {
  await connectDB();

  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email }).exec();
  if (existing) {
    throw new Error('Ez az e-mail c?m m?r foglalt.');
  }

  if (input.employee && !input.skipCompanyScope && input.actorUserId && input.actorPermissions) {
    await assertCompanyInScope(input.employee.companyId, input.actorUserId, input.actorPermissions);
  }

  let roleIds = input.roleIds;
  if (input.employee) {
    roleIds = await ensureEmployeeRole(roleIds);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email,
    name: input.name.trim(),
    passwordHash,
    roleIds,
    directPermissionKeys: input.directPermissionKeys ?? [],
    isActive: input.isActive ?? true,
  });

  let employee: IEmployee | undefined;
  if (input.employee) {
    const existingEmp = await Employee.findOne({
      userId: user._id,
      companyId: input.employee.companyId,
    }).exec();
    if (existingEmp) {
      throw new Error('A felhaszn?l?hoz m?r tartozik dolgoz?i rekord ebben a c?gben.');
    }

    employee = await Employee.create({
      companyId: input.employee.companyId,
      name: user.name,
      email,
      employeeNumber: input.employee.employeeNumber,
      department: input.employee.department,
      phone: input.employee.phone,
      hrNotes: input.employee.hrNotes,
      userId: user._id,
      employmentType: 'employee',
      isActive: true,
    });
  }

  return { user, employee };
}

export async function linkUserToCompanyEmployee(
  userId: Types.ObjectId,
  data: {
    name: string;
    email: string;
    companyId: Types.ObjectId;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    hrNotes?: string;
    isActive?: boolean;
  },
  options?: {
    skipCompanyScope?: boolean;
    actorUserId?: Types.ObjectId;
    actorPermissions?: string[];
  }
): Promise<IEmployee> {
  await connectDB();

  if (!options?.skipCompanyScope && options?.actorUserId && options?.actorPermissions) {
    await assertCompanyInScope(data.companyId, options.actorUserId, options.actorPermissions);
  }

  const user = await User.findById(userId).exec();
  if (!user) throw new Error('Felhaszn?l? nem tal?lhat?.');

  await ensureEmployeeRoleForUser(user);

  const existing = await Employee.findOne({ userId, companyId: data.companyId }).exec();
  if (existing) {
    existing.name = data.name;
    existing.email = data.email.toLowerCase();
    existing.employeeNumber = data.employeeNumber;
    existing.department = data.department;
    existing.phone = data.phone;
    existing.hrNotes = data.hrNotes;
    if (data.isActive !== undefined) existing.isActive = data.isActive;
    existing.employmentType = 'employee';
    await existing.save();
    return existing;
  }

  return Employee.create({
    companyId: data.companyId,
    name: data.name,
    email: data.email.toLowerCase(),
    employeeNumber: data.employeeNumber,
    department: data.department,
    phone: data.phone,
    hrNotes: data.hrNotes,
    userId,
    employmentType: 'employee',
    isActive: data.isActive ?? true,
  });
}

/** @deprecated Prefer linkUserToCompanyEmployee for multi-company; updates first employee or creates at company. */
export async function upsertEmployeeForUser(
  userId: Types.ObjectId,
  data: {
    name: string;
    email: string;
    companyId: Types.ObjectId;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    hrNotes?: string;
    isActive?: boolean;
  },
  options?: {
    skipCompanyScope?: boolean;
    actorUserId?: Types.ObjectId;
    actorPermissions?: string[];
  }
): Promise<IEmployee> {
  return linkUserToCompanyEmployee(userId, data, options);
}

export async function removeEmployeeLinkForUser(
  userId: Types.ObjectId,
  companyId?: Types.ObjectId
): Promise<void> {
  await connectDB();
  const filter: { userId: Types.ObjectId; companyId?: Types.ObjectId } = { userId };
  if (companyId) filter.companyId = companyId;

  const emps = await Employee.find(filter).exec();
  for (const emp of emps) {
    emp.userId = undefined;
    emp.employmentType = 'guest';
    await emp.save();
  }
}
