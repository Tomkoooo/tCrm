/**
 * One-time migration: replace unique userId index on employees with compound (userId, companyId).
 * Run: pnpm --filter @crm/db exec tsx src/migrate-employee-multi-company.ts
 */
import { connectDB } from './connection';
import { Employee } from './models/Employee';

async function main() {
  await connectDB();
  const collection = Employee.collection;

  const indexes = await collection.indexes();
  const userIdUnique = indexes.find(
    (idx) => idx.key?.userId === 1 && idx.unique && !idx.key?.companyId
  );

  if (userIdUnique?.name) {
    console.log(`Dropping old index: ${userIdUnique.name}`);
    await collection.dropIndex(userIdUnique.name);
  } else {
    console.log('No legacy unique userId index found — skipping drop.');
  }

  await Employee.syncIndexes();
  console.log('Employee indexes synced.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
