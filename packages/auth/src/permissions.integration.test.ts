import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestMongo } from './test/mongo-memory';
import { Permission, Role, User, connectDB, ensureBaselineRbac } from '@crm/db';
import { getEffectivePermissionKeys, userHasAnyPermission, userHasPermission } from './permissions';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await ensureBaselineRbac();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('getEffectivePermissionKeys', () => {
  it('merges role permissions and direct keys', async () => {
    const invRead = await Permission.findOne({ key: 'inventory:read' }).exec();
    const hrRead = await Permission.findOne({ key: 'hr:read' }).exec();
    if (!invRead || !hrRead) throw new Error('baseline permissions missing');

    const role = await Role.create({
      key: 'test-merge-role',
      name: 'Test Merge',
      permissionIds: [invRead._id],
      isSystem: false,
    });

    const user = await User.create({
      email: 'perms-merge@test.local',
      name: 'Perms Merge',
      passwordHash: 'hash',
      roleIds: [role._id],
      directPermissionKeys: ['hr:read'],
      isActive: true,
    });

    const keys = await getEffectivePermissionKeys(user._id.toString());
    expect(keys.has('inventory:read')).toBe(true);
    expect(keys.has('hr:read')).toBe(true);
    expect(keys.has('inventory:write')).toBe(false);
  });

  it('returns empty set for inactive user', async () => {
    const user = await User.create({
      email: 'perms-inactive@test.local',
      name: 'Inactive',
      passwordHash: 'hash',
      roleIds: [],
      directPermissionKeys: ['admin:access'],
      isActive: false,
    });

    const keys = await getEffectivePermissionKeys(user._id.toString());
    expect(keys.size).toBe(0);
  });
});

describe('userHasPermission', () => {
  it('returns true when key present', async () => {
    const user = await User.create({
      email: 'perms-has@test.local',
      name: 'Has Perm',
      passwordHash: 'hash',
      roleIds: [],
      directPermissionKeys: ['users:read'],
      isActive: true,
    });

    expect(await userHasPermission(user._id.toString(), 'users:read')).toBe(true);
    expect(await userHasPermission(user._id.toString(), 'users:write')).toBe(false);
  });

  it('userHasAnyPermission matches one of keys', async () => {
    const user = await User.create({
      email: 'perms-any@test.local',
      name: 'Any Perm',
      passwordHash: 'hash',
      roleIds: [],
      directPermissionKeys: ['hr:self'],
      isActive: true,
    });

    expect(await userHasAnyPermission(user._id.toString(), ['hr:read', 'hr:self'])).toBe(true);
    expect(await userHasAnyPermission(user._id.toString(), ['admin:access'])).toBe(false);
  });
});
