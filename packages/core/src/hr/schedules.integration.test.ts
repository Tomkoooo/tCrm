import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Company, Employee, ScheduleEntry, User, connectDB } from '@crm/db';
import { suggestWorkedHoursFromSchedule } from './schedules';

let mongo: MongoMemoryServer;
let employeeId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();

  const company = await Company.create({ name: 'Sched Co', slug: 'sched-co', isActive: true });
  const user = await User.create({
    email: 'sched@test.local',
    name: 'Sched User',
    passwordHash: 'hash',
    roleIds: [],
    directPermissionKeys: [],
    isActive: true,
  });
  const employee = await Employee.create({
    companyId: company._id,
    name: user.name,
    email: user.email,
    userId: user._id,
    employmentType: 'employee',
    isActive: true,
  });
  employeeId = employee._id;

  await ScheduleEntry.create([
    {
      employeeId,
      companyId: company._id,
      start: new Date('2026-05-05T08:00:00'),
      end: new Date('2026-05-05T12:00:00'),
      kind: 'shift',
      createdBy: user._id,
      updatedBy: user._id,
    },
    {
      employeeId,
      companyId: company._id,
      start: new Date('2026-05-10T09:00:00'),
      end: new Date('2026-05-10T13:00:00'),
      kind: 'shift',
      createdBy: user._id,
      updatedBy: user._id,
    },
    {
      employeeId,
      companyId: company._id,
      start: new Date('2026-05-15T08:00:00'),
      end: new Date('2026-05-15T12:00:00'),
      kind: 'off',
      createdBy: user._id,
      updatedBy: user._id,
    },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('suggestWorkedHoursFromSchedule', () => {
  it('sums shift hours in month excluding off days', async () => {
    const hours = await suggestWorkedHoursFromSchedule(employeeId, 2026, 5);
    expect(hours).toBe(8);
  });
});
