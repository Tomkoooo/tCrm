import bcrypt from 'bcryptjs';
import {
  connectDB,
  Employee,
  Role,
  User,
  HrRequest,
  ScheduleEntry,
  MonthlyWorkSummary,
  EmployeeLeaveYear,
  type IEmployee,
  type EmploymentType,
} from '@crm/db';
import type { Types, PipelineStage } from 'mongoose';
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
    calendarColor?: string;
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
    calendarColor?: string;
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
    return Employee.find({ userId: emp.userId }).sort({ companyId: 1 }).exec();
  }
  if (emp.email?.trim()) {
    const email = emp.email.toLowerCase().trim();
    return Employee.find({ email }).sort({ companyId: 1 }).exec();
  }
  return [emp as IEmployee];
}

export type EmployeePersonMembership = {
  employeeId: string;
  companyId: string;
  department?: string;
  isActive: boolean;
};

export type EmployeePersonGroup = {
  personKey: string;
  primaryEmployeeId: string;
  name: string;
  email?: string;
  department?: string;
  employmentType: EmploymentType;
  hasUser: boolean;
  isActive: boolean;
  companyIds: string[];
  memberships: EmployeePersonMembership[];
};

/** Mongo $addFields stage — group key for one person across company records. */
export function employeePersonKeyAddFields(): PipelineStage {
  return {
    $addFields: {
      personKey: {
        $cond: [
          { $ne: [{ $ifNull: ['$userId', null] }, null] },
          { $concat: ['u:', { $toString: '$userId' }] },
          {
            $cond: [
              {
                $gt: [
                  {
                    $strLenCP: {
                      $trim: { input: { $ifNull: ['$email', ''] } },
                    },
                  },
                  0,
                ],
              },
              {
                $concat: ['e:', { $toLower: { $trim: { input: '$email' } } }],
              },
              { $concat: ['i:', { $toString: '$_id' }] },
            ],
          },
        ],
      },
    },
  };
}

export async function listEmployeePersonGroups(params: {
  scopeFilter: Record<string, unknown>;
  matchFilter?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
}): Promise<{ groups: EmployeePersonGroup[]; total: number }> {
  await connectDB();

  const preMatch = { ...params.scopeFilter, ...(params.matchFilter ?? {}) };
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;

  const groupSort: Record<string, 1 | -1> = {};
  if (params.sort) {
    for (const [key, dir] of Object.entries(params.sort)) {
      groupSort[key] = dir;
    }
  }
  if (Object.keys(groupSort).length === 0) {
    groupSort.name = 1;
  }

  type AggGroup = {
    _id: string;
    primaryEmployeeId: Types.ObjectId;
    name: string;
    email?: string;
    department?: string;
    employmentType: EmploymentType;
    userId?: Types.ObjectId;
    isActive: boolean;
    companyIds: Types.ObjectId[];
    memberships: Array<{
      employeeId: Types.ObjectId;
      companyId: Types.ObjectId;
      department?: string;
      isActive: boolean;
    }>;
  };

  const pipeline: PipelineStage[] = [
    { $match: preMatch },
    { $sort: { createdAt: 1 } },
    employeePersonKeyAddFields(),
    {
      $group: {
        _id: '$personKey',
        primaryEmployeeId: { $first: '$_id' },
        name: { $first: '$name' },
        email: { $first: '$email' },
        department: { $first: '$department' },
        employmentType: { $first: '$employmentType' },
        userId: { $first: '$userId' },
        isActive: { $max: '$isActive' },
        companyIds: { $addToSet: '$companyId' },
        memberships: {
          $push: {
            employeeId: '$_id',
            companyId: '$companyId',
            department: '$department',
            isActive: '$isActive',
          },
        },
      },
    },
    { $sort: groupSort },
    { $skip: skip },
    { $limit: limit },
  ];

  const countPipeline: PipelineStage[] = [
    { $match: preMatch },
    employeePersonKeyAddFields(),
    { $group: { _id: '$personKey' } },
    { $count: 'total' },
  ];

  const [rawGroups, countResult] = await Promise.all([
    Employee.aggregate<AggGroup>(pipeline).exec(),
    Employee.aggregate<{ total: number }>(countPipeline).exec(),
  ]);

  const groups: EmployeePersonGroup[] = rawGroups.map((g) => ({
    personKey: g._id,
    primaryEmployeeId: String(g.primaryEmployeeId),
    name: g.name,
    email: g.email,
    department: g.department,
    employmentType: g.employmentType,
    hasUser: Boolean(g.userId),
    isActive: g.isActive,
    companyIds: g.companyIds.map((id) => String(id)),
    memberships: g.memberships.map((m) => ({
      employeeId: String(m.employeeId),
      companyId: String(m.companyId),
      department: m.department,
      isActive: m.isActive,
    })),
  }));

  return { groups, total: countResult[0]?.total ?? 0 };
}

export type EmployeePersonSharedProfile = {
  name: string;
  email?: string;
  phone?: string;
  hrNotes?: string;
  calendarColor?: string;
  workerCategory?: 'regular' | 'occasional';
  workScheduleType?: 'full_time' | 'part_time';
  contractedWeeklyHours?: number;
  contractedDailyHours?: number;
  personalData?: IEmployee['personalData'];
};

export type EmployeeCompanyMembershipProfile = {
  department?: string;
  employeeNumber?: string;
  payType?: 'monthly' | 'hourly';
  monthlySalaryHuf?: number;
  hourlyRateHuf?: number;
  isActive: boolean;
  employmentType: EmploymentType;
};

/** Sync shared profile fields to every company record for the same person. */
export async function updateEmployeePersonProfile(
  anchorEmployeeId: Types.ObjectId,
  data: EmployeePersonSharedProfile,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<number> {
  await connectDB();
  const records = await listEmployeeRecordsForSamePerson(anchorEmployeeId);
  if (!records.length) throw new Error('Dolgozó nem található.');

  let updated = 0;
  for (const emp of records) {
    await assertCompanyInScope(emp.companyId, actorUserId, permissions);
    emp.name = data.name.trim();
    if (data.email !== undefined) emp.email = data.email?.toLowerCase().trim() || undefined;
    if (data.phone !== undefined) emp.phone = data.phone;
    if (data.hrNotes !== undefined) emp.hrNotes = data.hrNotes;
    if (data.calendarColor !== undefined) emp.calendarColor = data.calendarColor || undefined;
    if (data.workerCategory !== undefined) emp.workerCategory = data.workerCategory;
    if (data.workScheduleType !== undefined) emp.workScheduleType = data.workScheduleType;
    if (data.contractedWeeklyHours !== undefined) {
      emp.contractedWeeklyHours = data.contractedWeeklyHours;
    }
    if (data.contractedDailyHours !== undefined) {
      emp.contractedDailyHours = data.contractedDailyHours;
    }
    if (data.personalData !== undefined) {
      emp.personalData = data.personalData;
    }
    await emp.save();
    updated++;
  }
  return updated;
}

export async function updateEmployeeCompanyMembership(
  employeeId: Types.ObjectId,
  data: EmployeeCompanyMembershipProfile,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const emp = await Employee.findById(employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);

  if (data.department !== undefined) emp.department = data.department;
  if (data.employeeNumber !== undefined) emp.employeeNumber = data.employeeNumber;
  if (data.payType !== undefined) emp.payType = data.payType;
  if (data.monthlySalaryHuf !== undefined) emp.monthlySalaryHuf = data.monthlySalaryHuf;
  if (data.hourlyRateHuf !== undefined) emp.hourlyRateHuf = data.hourlyRateHuf;
  emp.isActive = data.isActive;
  emp.employmentType = data.employmentType;
  await emp.save();
  return emp;
}

export type EmployeeLinkResult = {
  employee: IEmployee;
  /** Other company guest records linked to the same CRM user in this operation. */
  alsoLinkedCount: number;
};

/** Link guest records at other companies that share the same e-mail to the same CRM user. */
async function propagateUserLinkToSiblingGuestEmployees(
  sourceEmployee: IEmployee,
  targetUserId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<number> {
  if (!sourceEmployee.email?.trim()) return 0;

  const allowed = await resolveAllowedCompanyIds(actorUserId, permissions);
  const email = sourceEmployee.email.toLowerCase().trim();

  const filter: Record<string, unknown> = {
    email,
    isActive: true,
    _id: { $ne: sourceEmployee._id },
    $or: [{ userId: { $exists: false } }, { userId: null }],
  };
  if (allowed !== null) {
    if (!allowed.length) return 0;
    filter.companyId = { $in: allowed };
  }

  const siblings = await Employee.find(filter).exec();
  let linked = 0;

  for (const sibling of siblings) {
    const duplicate = await Employee.findOne({
      userId: targetUserId,
      companyId: sibling.companyId,
      _id: { $ne: sibling._id },
    }).exec();
    if (duplicate) continue;

    sibling.userId = targetUserId;
    sibling.employmentType = 'employee';
    if (!sibling.email) sibling.email = email;
    await sibling.save();
    linked++;
  }

  return linked;
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
): Promise<EmployeeLinkResult> {
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

  const alsoLinkedCount = await propagateUserLinkToSiblingGuestEmployees(
    emp,
    targetUserId,
    actorUserId,
    permissions
  );

  return { employee: emp, alsoLinkedCount };
}

/** Link guest employee to CRM user when emails match (case-insensitive). */
export async function linkGuestEmployeeByEmailMatch(
  employeeId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<EmployeeLinkResult> {
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
): Promise<EmployeeLinkResult> {
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

  const alsoLinkedCount = await propagateUserLinkToSiblingGuestEmployees(
    emp,
    user._id,
    actorUserId,
    permissions
  );

  return { employee: emp, alsoLinkedCount };
}

export async function deleteEmployee(
  employeeId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<void> {
  await connectDB();
  const emp = await Employee.findById(employeeId).exec();
  if (!emp) throw new Error('Dolgozó nem található.');
  await assertCompanyInScope(emp.companyId, actorUserId, permissions);

  const id = emp._id;
  const [requests, schedules, summaries, leaveYears] = await Promise.all([
    HrRequest.countDocuments({ employeeId: id }).exec(),
    ScheduleEntry.countDocuments({ employeeId: id }).exec(),
    MonthlyWorkSummary.countDocuments({ employeeId: id }).exec(),
    EmployeeLeaveYear.countDocuments({ employeeId: id }).exec(),
  ]);

  const blocks: string[] = [];
  if (requests) blocks.push(`${requests} kérelem`);
  if (schedules) blocks.push(`${schedules} beosztás`);
  if (summaries) blocks.push(`${summaries} havi kimutatás`);
  if (leaveYears) blocks.push(`${leaveYears} éves szabadságkeret`);

  if (blocks.length) {
    throw new Error(`A dolgozó nem törölhető: ${blocks.join(', ')} kapcsolódik hozzá.`);
  }

  await Employee.deleteOne({ _id: id }).exec();
}

export async function unlinkEmployeeUser(
  employeeId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<IEmployee> {
  await connectDB();
  const anchor = await Employee.findById(employeeId).exec();
  if (!anchor) throw new Error('Dolgozó nem található.');

  const records = anchor.userId ? await Employee.find({ userId: anchor.userId }).exec() : [anchor];

  for (const emp of records) {
    await assertCompanyInScope(emp.companyId, actorUserId, permissions);
    emp.userId = undefined;
    emp.employmentType = 'guest';
    await emp.save();
  }

  return anchor;
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
