import { connectDB } from './connection';
import { Employee } from './models/Employee';

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
  g[SYNCED] = true;
}
