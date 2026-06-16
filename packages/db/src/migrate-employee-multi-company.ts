/**
 * CLI: replace unique userId index on employees with compound (userId, companyId).
 * Run: pnpm --filter @crm/db exec tsx src/migrate-employee-multi-company.ts
 *
 * Also runs automatically via ensureEmployeeMultiCompanyIndexesOnce on dashboard boot.
 */
import { migrateEmployeeMultiCompanyIndexes } from './employee-index-sync';

async function main() {
  await migrateEmployeeMultiCompanyIndexes();
  console.log('Employee indexes synced.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
