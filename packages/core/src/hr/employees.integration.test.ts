import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestMongo } from '../test/mongo-memory';
import { Company, Employee, Role, User, connectDB, ensureBaselineRbac } from '@crm/db';
import {
  linkGuestEmployeeToExistingUser,
  inviteEmployeeToUser,
  deleteEmployee,
  listEmployeePersonGroups,
} from './employees';

let mongo: MongoMemoryServer;
let companyA: mongoose.Types.ObjectId;
let companyB: mongoose.Types.ObjectId;
let hrUserId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await ensureBaselineRbac();

  const [a, b] = await Company.create([
    { name: 'Link Co A', slug: 'link-co-a', isActive: true },
    { name: 'Link Co B', slug: 'link-co-b', isActive: true },
  ]);
  companyA = a._id;
  companyB = b._id;

  const hrUser = await User.create({
    email: 'hr-link@test.local',
    name: 'HR Link',
    passwordHash: 'hash',
    roleIds: [],
    directPermissionKeys: ['hr:write'],
    isActive: true,
  });
  hrUserId = hrUser._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('multi-company employee account linking', () => {
  it('links sibling guest records at other companies when connecting CRM user', async () => {
    const crmUser = await User.create({
      email: 'multi-co@test.local',
      name: 'Multi Co Worker',
      passwordHash: 'hash',
      roleIds: [],
      directPermissionKeys: [],
      isActive: true,
    });

    const [empA, empB] = await Employee.create([
      {
        companyId: companyA,
        name: 'Multi Co Worker',
        email: 'multi-co@test.local',
        employmentType: 'guest',
        isActive: true,
      },
      {
        companyId: companyB,
        name: 'Multi Co Worker',
        email: 'multi-co@test.local',
        employmentType: 'guest',
        isActive: true,
      },
    ]);

    const { employee, alsoLinkedCount } = await linkGuestEmployeeToExistingUser(
      empA._id,
      crmUser._id,
      hrUserId,
      ['hr:write', 'hr:scope_all']
    );

    expect(employee.userId?.equals(crmUser._id)).toBe(true);
    expect(alsoLinkedCount).toBe(1);

    const reloadedB = await Employee.findById(empB._id).exec();
    expect(reloadedB?.userId?.equals(crmUser._id)).toBe(true);
    expect(reloadedB?.employmentType).toBe('employee');
  });

  it('propagates invite link to sibling guest records', async () => {
    const [empA, empB] = await Employee.create([
      {
        companyId: companyA,
        name: 'Invite Prop Worker',
        email: 'invite-prop@test.local',
        employmentType: 'guest',
        isActive: true,
      },
      {
        companyId: companyB,
        name: 'Invite Prop Worker',
        email: 'invite-prop@test.local',
        employmentType: 'guest',
        isActive: true,
      },
    ]);

    const { alsoLinkedCount } = await inviteEmployeeToUser(empA._id, 'password12345', hrUserId, [
      'hr:write',
      'hr:scope_all',
    ]);

    expect(alsoLinkedCount).toBe(1);

    const reloadedB = await Employee.findById(empB._id).exec();
    expect(reloadedB?.userId).toBeTruthy();
    expect(reloadedB?.employmentType).toBe('employee');

    const user = await User.findOne({ email: 'invite-prop@test.local' }).exec();
    expect(user).toBeTruthy();
    const employeeRole = await Role.findOne({ key: 'employee' }).exec();
    expect(user?.roleIds.some((id) => id.equals(employeeRole!._id))).toBe(true);
  });
});

describe('listEmployeePersonGroups', () => {
  it('groups same e-mail across companies into one row', async () => {
    await Employee.create([
      {
        companyId: companyA,
        name: 'Grouped Worker',
        email: 'grouped@test.local',
        employmentType: 'guest',
        isActive: true,
      },
      {
        companyId: companyB,
        name: 'Grouped Worker',
        email: 'grouped@test.local',
        employmentType: 'guest',
        isActive: true,
      },
    ]);

    const { groups, total } = await listEmployeePersonGroups({
      scopeFilter: {},
      matchFilter: { email: 'grouped@test.local' },
    });

    expect(total).toBe(1);
    expect(groups[0]?.companyIds).toHaveLength(2);
  });
});

describe('deleteEmployee', () => {
  it('deletes empty employee record', async () => {
    const emp = await Employee.create({
      companyId: companyA,
      name: 'Delete Me',
      email: 'delete-me@test.local',
      employmentType: 'guest',
      isActive: true,
    });

    await deleteEmployee(emp._id, hrUserId, ['hr:write', 'hr:scope_all']);
    const gone = await Employee.findById(emp._id).exec();
    expect(gone).toBeNull();
  });
});
