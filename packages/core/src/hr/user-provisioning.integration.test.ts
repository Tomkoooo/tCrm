import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestMongo } from '../test/mongo-memory';
import {
  Company,
  Employee,
  HrCompanyScope,
  Role,
  User,
  connectDB,
  ensureBaselineRbac,
} from '@crm/db';
import { provisionUserWithEmployee, upsertEmployeeForUser } from './user-provisioning';

let mongo: MongoMemoryServer;
let companyId: mongoose.Types.ObjectId;
let otherCompanyId: mongoose.Types.ObjectId;
let employeeRoleId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await ensureBaselineRbac();

  const employeeRole = await Role.findOne({ key: 'employee' }).exec();
  if (!employeeRole) throw new Error('employee role missing');
  employeeRoleId = employeeRole._id;

  const [c1, c2] = await Company.create([
    { name: 'Test Co A', slug: 'test-co-a', isActive: true },
    { name: 'Test Co B', slug: 'test-co-b', isActive: true },
  ]);
  companyId = c1._id;
  otherCompanyId = c2._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('provisionUserWithEmployee', () => {
  it('creates user and employee with employee role', async () => {
    const { user, employee } = await provisionUserWithEmployee({
      name: 'New Worker',
      email: 'worker-prov@test.local',
      password: 'password12345',
      roleIds: [],
      employee: { companyId },
      skipCompanyScope: true,
    });

    expect(employee).toBeTruthy();
    expect(employee?.companyId.equals(companyId)).toBe(true);

    const reloaded = await User.findById(user._id).exec();
    expect(reloaded?.roleIds.some((id) => id.equals(employeeRoleId))).toBe(true);
  });

  it('throws on duplicate email', async () => {
    await expect(
      provisionUserWithEmployee({
        name: 'Dup',
        email: 'worker-prov@test.local',
        password: 'password12345',
        roleIds: [],
        skipCompanyScope: true,
      })
    ).rejects.toThrow(/foglalt/);
  });

  it('denies company outside HR scope', async () => {
    const hrUser = await User.create({
      email: 'scoped-hr@test.local',
      name: 'Scoped HR',
      passwordHash: 'hash',
      roleIds: [],
      directPermissionKeys: ['hr:write'],
      isActive: true,
    });
    await HrCompanyScope.create({ userId: hrUser._id, companyIds: [companyId] });

    await expect(
      provisionUserWithEmployee({
        name: 'Out of scope',
        email: 'out-scope@test.local',
        password: 'password12345',
        roleIds: [],
        employee: { companyId: otherCompanyId },
        actorUserId: hrUser._id,
        actorPermissions: ['hr:write'],
      })
    ).rejects.toThrow(/jogosultság/);
  });
});

describe('upsertEmployeeForUser / multi-company', () => {
  it('creates then updates employee profile at same company', async () => {
    const user = await User.create({
      email: 'upsert@test.local',
      name: 'Upsert User',
      passwordHash: 'hash',
      roleIds: [],
      directPermissionKeys: [],
      isActive: true,
    });

    const created = await upsertEmployeeForUser(
      user._id,
      {
        name: 'Upsert User',
        email: 'upsert@test.local',
        companyId,
        department: 'Sales',
      },
      { skipCompanyScope: true }
    );
    expect(created.department).toBe('Sales');

    const updated = await upsertEmployeeForUser(
      user._id,
      {
        name: 'Upsert User',
        email: 'upsert@test.local',
        companyId,
        department: 'IT',
      },
      { skipCompanyScope: true }
    );
    expect(updated.department).toBe('IT');
    expect(await Employee.countDocuments({ userId: user._id })).toBe(1);
  });

  it('allows same user at two companies', async () => {
    const user = await User.create({
      email: 'multi-co@test.local',
      name: 'Multi Co User',
      passwordHash: 'hash',
      roleIds: [],
      directPermissionKeys: [],
      isActive: true,
    });

    await upsertEmployeeForUser(
      user._id,
      {
        name: 'Multi Co User',
        email: 'multi-co@test.local',
        companyId,
        department: 'A',
      },
      { skipCompanyScope: true }
    );

    await upsertEmployeeForUser(
      user._id,
      {
        name: 'Multi Co User',
        email: 'multi-co@test.local',
        companyId: otherCompanyId,
        department: 'B',
      },
      { skipCompanyScope: true }
    );

    expect(await Employee.countDocuments({ userId: user._id })).toBe(2);
  });
});
