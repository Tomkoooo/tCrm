import { connectDB } from './connection';
import { Employee } from './models/Employee';

const DEFAULTS_SYNCED = Symbol.for('crm.employeeDefaultFieldsSynced');

/**
 * Backfill schema defaults on legacy/imported employee rows (no workerCategory field).
 */
export async function migrateEmployeeDefaultFields(): Promise<number> {
  await connectDB();
  const [cat, sched] = await Promise.all([
    Employee.updateMany(
      { $or: [{ workerCategory: { $exists: false } }, { workerCategory: null }] },
      { $set: { workerCategory: 'regular' } }
    ).exec(),
    Employee.updateMany(
      { $or: [{ workScheduleType: { $exists: false } }, { workScheduleType: null }] },
      { $set: { workScheduleType: 'full_time' } }
    ).exec(),
  ]);
  return cat.modifiedCount + sched.modifiedCount;
}

export async function ensureEmployeeDefaultFieldsOnce(): Promise<void> {
  const g = globalThis as typeof globalThis & { [DEFAULTS_SYNCED]?: boolean };
  if (g[DEFAULTS_SYNCED]) return;
  await migrateEmployeeDefaultFields();
  g[DEFAULTS_SYNCED] = true;
}

const SYNCED = Symbol.for('crm.employeeMultiCompanyIndexesSynced');

/**
 * Drops legacy unique userId-only index and syncs compound (userId, companyId) index.
 * Safe to run once per Node process on deploy — fixes E11000 when linking one CRM user
 * to employee records at multiple companies.
 */
export async function migrateEmployeeMultiCompanyIndexes(): Promise<void> {
  await connectDB();
  const collection = Employee.collection;

  const indexes = await collection.indexes();
  const userIdUnique = indexes.find(
    (idx) => idx.key?.userId === 1 && idx.unique && !idx.key?.companyId
  );

  if (userIdUnique?.name) {
    await collection.dropIndex(userIdUnique.name);
  }

  await Employee.syncIndexes();
}

export async function ensureEmployeeMultiCompanyIndexesOnce(): Promise<void> {
  const g = globalThis as typeof globalThis & { [SYNCED]?: boolean };
  if (g[SYNCED]) return;
  await migrateEmployeeMultiCompanyIndexes();
  await migrateEmployeeDefaultFields();
  g[SYNCED] = true;
}
