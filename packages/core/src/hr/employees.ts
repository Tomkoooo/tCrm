import bcrypt from 'bcryptjs';
import { connectDB, Employee, Role, User, type IEmployee, type EmploymentType } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope, resolveAllowedCompanyIds } from './company-scope';

export async function listEmployeesForUser(userId: Types.ObjectId): Promise<IEmployee[]> {
  await connectDB();
  return Employee.find({ userId, isActive: true }).sort({ name: 1 }).exec();
}

/** @deprecated Use listEmployeesForUser or getEmployeeForUser */
export async function getEmployeeByUserId(userId: Types.ObjectId): Promise<IEmployee | null> {
  await connectDB();
  return Employee.findOne({ userId, isActive: true }).sort({ createdAt: 1 }).exec();
}

export async function getEmployeeForUser(
  userId: Types.ObjectId,
  options?: { companyId?: Types.ObjectId; employeeId?: Types.ObjectId }
): Promise<IEmployee | null> {
  await connectDB();
  if (options?.employeeId) {
    return Employee.findOne({ _id: options.employeeId, userId, isActive: true }).exec();
  }
  if (options?.companyId) {
    return Employee.findOne({ userId, companyId: options.companyId, isActive: true }).exec();
  }
  return getEmployeeByUserId(userId);
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
    userId?: Types.ObjectId;
    workerCategory?: 'regular' | 'occasional';
    workScheduleType?: 'full_time' | 'part_time';
    contractedWeeklyHours?: number;
    contractedDailyHours?: number;
    payType?: 'monthly' | 'hourly';
    monthlySalaryHuf?: number;
    hourlyRateHuf?: number;
    personalData?: IEmployee['personalData'];
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  await assertCompanyInScope(data.companyId, actorUserId, permissions);

  if (data.userId) {
    const existing = await Employee.findOne({
      userId: data.userId,
      companyId: data.companyId,
    }).exec();
    if (existing) {
      throw new Error('A felhasználó már dolgozó ebben a cégben.');
    }
  }

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
    workerCategory: 'regular' | 'occasional';
    workScheduleType: 'full_time' | 'part_time';
    contractedWeeklyHours?: number;
    contractedDailyHours?: number;
    payType?: 'monthly' | 'hourly';
    monthlySalaryHuf?: number;
    hourlyRateHuf?: number;
    personalData?: {
      birthName?: string;
      birthPlaceDate?: string;
      mothersName?: string;
      address?: string;
      taj?: string;
      taxId?: string;
    };
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

export async function searchUsersForHrLink(
  query: string,
  limit = 10
): Promise<Array<{ _id: string; name: string; email: string }>> {
  await connectDB();
  const q = query.trim();
  if (q.length < 2) return [];

  const filter = q.includes('@')
    ? { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    : {
        $or: [
          { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
          { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        ],
      };

  const users = await User.find({ ...filter, isActive: true })
    .select({ name: 1, email: 1 })
    .limit(limit)
    .lean()
    .exec();

  return users.map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
  }));
}

export async function linkExistingUserToEmployee(
  targetUserId: Types.ObjectId,
  data: {
    companyId: Types.ObjectId;
    name?: string;
    email?: string;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    hrNotes?: string;
    isActive?: boolean;
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  await assertCompanyInScope(data.companyId, actorUserId, permissions);

  const user = await User.findById(targetUserId).exec();
  if (!user) throw new Error('Felhasználó nem található.');

  const existing = await Employee.findOne({
    userId: targetUserId,
    companyId: data.companyId,
  }).exec();
  if (existing) {
    throw new Error('A felhasználó már dolgozó ebben a cégben.');
  }

  const employeeRole = await Role.findOne({ key: 'employee' }).exec();
  if (employeeRole) {
    const hasRole = user.roleIds.some((id) => id.equals(employeeRole._id));
    if (!hasRole) {
      user.roleIds.push(employeeRole._id);
      await user.save();
    }
  }

  return Employee.create({
    companyId: data.companyId,
    name: data.name?.trim() || user.name,
    email: (data.email ?? user.email).toLowerCase(),
    employeeNumber: data.employeeNumber,
    department: data.department,
    phone: data.phone,
    hrNotes: data.hrNotes,
    userId: targetUserId,
    employmentType: 'employee',
    isActive: data.isActive ?? true,
  });
}

export async function listEmployeeRecordsForSamePerson(
  employeeId: Types.ObjectId
): Promise<IEmployee[]> {
  await connectDB();
  const emp = await Employee.findById(employeeId).lean().exec();
  if (!emp) return [];

  if (emp.userId) {
    return Employee.find({ userId: emp.userId, isActive: true }).sort({ companyId: 1 }).exec();
  }
  if (emp.email?.trim()) {
    return Employee.find({
      email: emp.email.toLowerCase().trim(),
      isActive: true,
    })
      .sort({ companyId: 1 })
      .exec();
  }
  return [emp as IEmployee];
}

/** New employee record in another company — separate beosztás, szabadság, kimutatás. */
export async function addEmployeeToAnotherCompany(
  sourceEmployeeId: Types.ObjectId,
  targetCompanyId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const source = await Employee.findById(sourceEmployeeId).exec();
  if (!source) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(source.companyId, actorUserId, permissions);
  await assertCompanyInScope(targetCompanyId, actorUserId, permissions);

  if (source.companyId.equals(targetCompanyId)) {
    throw new Error('A dolgozó már ebben a cégben szerepel.');
  }

  const dupFilter: Record<string, unknown> = {
    companyId: targetCompanyId,
    isActive: true,
  };
  if (source.userId) {
    dupFilter.userId = source.userId;
  } else if (source.email?.trim()) {
    dupFilter.email = source.email.toLowerCase().trim();
  } else {
    throw new Error('E-mail vagy CRM fiók szükséges a másik céghez adáshoz.');
  }

  const existing = await Employee.findOne(dupFilter).exec();
  if (existing) {
    throw new Error('Már van dolgozói rekord ebben a cégben (ugyanaz a fiók / e-mail).');
  }

  if (source.userId) {
    const user = await User.findById(source.userId).exec();
    if (!user) throw new Error('A kapcsolt CRM felhasználó nem található.');
    const employeeRole = await Role.findOne({ key: 'employee' }).exec();
    if (employeeRole) {
      const hasRole = user.roleIds.some((id) => id.equals(employeeRole._id));
      if (!hasRole) {
        user.roleIds.push(employeeRole._id);
        await user.save();
      }
    }
  }

  return Employee.create({
    companyId: targetCompanyId,
    name: source.name,
    email: source.email?.toLowerCase(),
    employeeNumber: source.employeeNumber,
    department: source.department,
    phone: source.phone,
    userId: source.userId,
    employmentType: source.userId ? 'employee' : 'guest',
    workerCategory: source.workerCategory ?? 'regular',
    workScheduleType: source.workScheduleType ?? 'full_time',
    contractedWeeklyHours: source.contractedWeeklyHours,
    contractedDailyHours: source.contractedDailyHours,
    payType: source.payType,
    monthlySalaryHuf: source.monthlySalaryHuf,
    hourlyRateHuf: source.hourlyRateHuf,
    personalData: source.personalData ? { ...source.personalData } : undefined,
    isActive: true,
    hrNotes: source.hrNotes,
  });
}

export async function linkGuestEmployeeToExistingUser(
  employeeId: Types.ObjectId,
  targetUserId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const emp = await Employee.findById(employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);
  if (emp.userId) throw new Error('A dolgozó már rendelkezik felhasználói fiókkal.');

  const user = await User.findById(targetUserId).exec();
  if (!user) throw new Error('Felhasználó nem található.');

  const duplicate = await Employee.findOne({
    userId: targetUserId,
    companyId: emp.companyId,
    _id: { $ne: emp._id },
  }).exec();
  if (duplicate) throw new Error('A felhasználó már dolgozó ebben a cégben.');

  const employeeRole = await Role.findOne({ key: 'employee' }).exec();
  if (employeeRole) {
    const hasRole = user.roleIds.some((id) => id.equals(employeeRole._id));
    if (!hasRole) {
      user.roleIds.push(employeeRole._id);
      await user.save();
    }
  }

  emp.userId = targetUserId;
  emp.employmentType = 'employee';
  if (!emp.email) emp.email = user.email.toLowerCase();
  await emp.save();
  return emp;
}

/** Link guest employee to CRM user when emails match (case-insensitive). */
export async function linkGuestEmployeeByEmailMatch(
  employeeId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const emp = await Employee.findById(employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  if (emp.userId) throw new Error('A dolgozó már rendelkezik fiókkal.');
  if (!emp.email?.trim()) {
    throw new Error('Az e-mail cím hiányzik — keressen felhasználót manuálisan.');
  }

  const user = await User.findOne({
    email: emp.email.toLowerCase().trim(),
    isActive: true,
  }).exec();
  if (!user) {
    throw new Error('Nincs aktív CRM felhasználó ezzel az e-mail címmel.');
  }

  return linkGuestEmployeeToExistingUser(employeeId, user._id, actorUserId, permissions);
}

export async function linkAllGuestEmployeesByEmailMatch(
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<{ linked: number; skipped: number; errors: string[] }> {
  await connectDB();
  const allowed = await resolveAllowedCompanyIds(actorUserId, permissions);

  const filter: Record<string, unknown> = {
    userId: { $exists: false },
    email: { $exists: true, $ne: '' },
    isActive: true,
  };
  if (allowed !== null) {
    if (!allowed.length) return { linked: 0, skipped: 0, errors: [] };
    filter.companyId = { $in: allowed };
  }

  const guests = await Employee.find(filter).exec();
  let linked = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const emp of guests) {
    try {
      await linkGuestEmployeeByEmailMatch(emp._id, actorUserId, permissions);
      linked++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ismeretlen hiba';
      if (msg.includes('Nincs aktív CRM')) skipped++;
      else errors.push(`${emp.name}: ${msg}`);
    }
  }

  return { linked, skipped, errors };
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

    const existingAtCompany = await Employee.findOne({
      userId: user._id,
      companyId: emp.companyId,
      _id: { $ne: emp._id },
    }).exec();
    if (existingAtCompany) {
      throw new Error('Ez a felhasználó már dolgozó ebben a cégben.');
    }
  }

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

export async function completeEmployeeOnboarding(
  userId: Types.ObjectId,
  employeeId: Types.ObjectId,
  data: {
    employeeNumber?: string;
    department?: string;
    phone?: string;
    hrNotes?: string;
  }
): Promise<IEmployee> {
  await connectDB();
  const emp = await Employee.findOne({ _id: employeeId, userId }).exec();
  if (!emp) throw new Error('Dolgozó nem található.');

  if (data.employeeNumber !== undefined) emp.employeeNumber = data.employeeNumber;
  if (data.department !== undefined) emp.department = data.department;
  if (data.phone !== undefined) emp.phone = data.phone;
  if (data.hrNotes !== undefined) emp.hrNotes = data.hrNotes;
  await emp.save();

  await User.updateOne(
    { _id: userId },
    { $set: { employeeOnboardingCompletedAt: new Date() } }
  ).exec();

  return emp;
}

export async function userNeedsEmployeeOnboarding(userId: Types.ObjectId): Promise<boolean> {
  await connectDB();
  const user = await User.findById(userId)
    .select({ employeeOnboardingCompletedAt: 1 })
    .lean()
    .exec();
  if (!user) return false;
  if (user.employeeOnboardingCompletedAt) return false;

  const linked = await Employee.countDocuments({
    userId,
    employmentType: 'employee',
    isActive: true,
  }).exec();
  return linked > 0;
}
