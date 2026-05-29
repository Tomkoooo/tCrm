import bcrypt from 'bcryptjs';
import { connectDB, Employee, Role, User, type IEmployee, type EmploymentType } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';

export async function getEmployeeByUserId(userId: Types.ObjectId): Promise<IEmployee | null> {
  await connectDB();
  return Employee.findOne({ userId, isActive: true }).exec();
}

export async function getEmployeeById(id: Types.ObjectId): Promise<IEmployee | null> {
  await connectDB();
  return Employee.findById(id).exec();
}

export async function createEmployee(
  data: {
    companyId: Types.ObjectId;
    name: string;
    email?: string;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    employmentType: EmploymentType;
    isActive: boolean;
    hrNotes?: string;
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  await assertCompanyInScope(data.companyId, actorUserId, permissions);
  return Employee.create(data);
}

export async function updateEmployee(
  id: Types.ObjectId,
  data: Partial<{
    companyId: Types.ObjectId;
    name: string;
    email?: string;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    employmentType: EmploymentType;
    isActive: boolean;
    hrNotes?: string;
  }>,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const emp = await Employee.findById(id).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);
  if (data.companyId) {
    await assertCompanyInScope(data.companyId, actorUserId, permissions);
  }
  Object.assign(emp, data);
  await emp.save();
  return emp;
}

export async function inviteEmployeeToUser(
  employeeId: Types.ObjectId,
  password: string,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const emp = await Employee.findById(employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);
  if (!emp.email) throw new Error('E-mail cím szükséges a meghíváshoz.');
  if (emp.userId) throw new Error('A dolgozó már rendelkezik felhasználói fiókkal.');

  const employeeRole = await Role.findOne({ key: 'employee' }).exec();
  if (!employeeRole) throw new Error('Az employee szerepkör nem található. Futtasd a seedet.');

  let user = await User.findOne({ email: emp.email.toLowerCase() }).exec();
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      email: emp.email.toLowerCase(),
      name: emp.name,
      passwordHash,
      roleIds: [employeeRole._id],
      directPermissionKeys: [],
      isActive: true,
    });
  } else {
    const roleIds = user.roleIds.map((id) => id.toString());
    if (!roleIds.includes(employeeRole._id.toString())) {
      user.roleIds.push(employeeRole._id);
      await user.save();
    }
  }

  const existingLink = await Employee.findOne({ userId: user._id, _id: { $ne: emp._id } }).exec();
  if (existingLink) throw new Error('Ez a felhasználó már más dolgozóhoz van kötve.');

  emp.userId = user._id;
  emp.employmentType = 'employee';
  await emp.save();
  return emp;
}

export async function unlinkEmployeeUser(
  employeeId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const emp = await Employee.findById(employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);
  emp.userId = undefined;
  emp.employmentType = 'guest';
  await emp.save();
  return emp;
}
