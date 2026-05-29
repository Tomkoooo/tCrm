import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  Company,
  Employee,
  HrRequest,
  MonthlyWorkSummary,
  ScheduleEntry,
  User,
  connectDB,
  ensureBaselineRbac,
} from '@crm/db';
import { cancelHrRequest, reviewHrRequest, submitHrRequest } from './requests';

let mongo: MongoMemoryServer;
let companyId: mongoose.Types.ObjectId;
let employeeUserId: mongoose.Types.ObjectId;
let employeeId: mongoose.Types.ObjectId;
let reviewerId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await ensureBaselineRbac();

  const company = await Company.create({ name: 'Req Co', slug: 'req-co', isActive: true });
  companyId = company._id;

  const employeeUser = await User.create({
    email: 'employee-req@test.local',
    name: 'Employee Req',
    passwordHash: 'hash',
    roleIds: [],
    directPermissionKeys: ['hr:self'],
    isActive: true,
  });
  employeeUserId = employeeUser._id;

  const employee = await Employee.create({
    companyId,
    name: employeeUser.name,
    email: employeeUser.email,
    userId: employeeUserId,
    employmentType: 'employee',
    isActive: true,
  });
  employeeId = employee._id;

  const reviewer = await User.create({
    email: 'reviewer-req@test.local',
    name: 'Reviewer',
    passwordHash: 'hash',
    roleIds: [],
    directPermissionKeys: ['hr:approve', 'hr:scope_all'],
    isActive: true,
  });
  reviewerId = reviewer._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    HrRequest.deleteMany({}),
    ScheduleEntry.deleteMany({}),
    MonthlyWorkSummary.deleteMany({}),
  ]);
});

describe('submitHrRequest', () => {
  it('allows linked employee to submit', async () => {
    const req = await submitHrRequest(employeeId, employeeUserId, {
      type: 'holiday',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-02'),
    });
    expect(req.status).toBe('pending');
  });

  it('rejects submit from wrong user', async () => {
    await expect(
      submitHrRequest(employeeId, reviewerId, {
        type: 'holiday',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-02'),
      })
    ).rejects.toThrow(/saját/);
  });
});

describe('cancelHrRequest', () => {
  it('cancels pending request by owner', async () => {
    const req = await submitHrRequest(employeeId, employeeUserId, {
      type: 'holiday',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-01'),
    });
    const cancelled = await cancelHrRequest(req._id, employeeUserId);
    expect(cancelled.status).toBe('cancelled');
  });
});

describe('reviewHrRequest', () => {
  it('approves holiday and updates summary', async () => {
    const req = await submitHrRequest(employeeId, employeeUserId, {
      type: 'holiday',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-02'),
    });

    const reviewed = await reviewHrRequest(req._id, true, reviewerId, [
      'hr:approve',
      'hr:scope_all',
    ]);
    expect(reviewed.status).toBe('approved');

    const summary = await MonthlyWorkSummary.findOne({
      employeeId,
      year: 2026,
      month: 9,
    }).exec();
    expect(summary?.holidayDays).toBeGreaterThan(0);

    const offEntries = await ScheduleEntry.countDocuments({ employeeId, kind: 'off' });
    expect(offEntries).toBeGreaterThan(0);
  });

  it('rejects request without side effects', async () => {
    const req = await submitHrRequest(employeeId, employeeUserId, {
      type: 'holiday',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-01'),
    });

    const reviewed = await reviewHrRequest(
      req._id,
      false,
      reviewerId,
      ['hr:approve', 'hr:scope_all'],
      'no'
    );
    expect(reviewed.status).toBe('rejected');
    expect(await ScheduleEntry.countDocuments({ employeeId })).toBe(0);
  });

  it('blocks self-approval', async () => {
    const req = await submitHrRequest(employeeId, employeeUserId, {
      type: 'holiday',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-01'),
    });

    await expect(
      reviewHrRequest(req._id, true, employeeUserId, ['hr:approve', 'hr:scope_all'])
    ).rejects.toThrow(/Saját/);
  });
});
