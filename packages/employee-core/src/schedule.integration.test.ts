import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestMongo } from '@crm/test-utils/mongo-memory';
import { connectDB } from '@crm/db-core';
import { Employee } from './models/Employee';
import {
  createScheduleEntry,
  listScheduleForEmployee,
  listScheduleBySourceRef,
  attachScheduleTag,
} from './schedule';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('schedule', () => {
  it('creates an entry tagged by a module sourceRef and lists it back', async () => {
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const employee = await Employee.create({
      companyId,
      name: 'Test Employee',
      employmentType: 'employee',
      workerCategory: 'regular',
      workScheduleType: 'full_time',
      isActive: true,
    });

    const refId = new mongoose.Types.ObjectId();
    const entry = await createScheduleEntry({
      employeeId: employee._id,
      companyId,
      start: new Date('2026-08-01T08:00:00Z'),
      end: new Date('2026-08-01T16:00:00Z'),
      sourceRef: { module: 'logistics', refType: 'event_assignment', refId },
      createdBy: userId,
    });

    const forEmployee = await listScheduleForEmployee(employee._id);
    expect(forEmployee).toHaveLength(1);
    expect(forEmployee[0]?._id.toString()).toBe(entry._id.toString());

    const bySourceRef = await listScheduleBySourceRef('logistics', 'event_assignment', refId);
    expect(bySourceRef).toHaveLength(1);

    const otherUser = new mongoose.Types.ObjectId();
    const retagged = await attachScheduleTag(
      entry._id,
      { module: 'logistics', refType: 'pickup_round', refId },
      otherUser
    );
    expect(retagged?.sourceRef?.refType).toBe('pickup_round');
    expect(retagged?.updatedBy.toString()).toBe(otherUser.toString());
  });
});
