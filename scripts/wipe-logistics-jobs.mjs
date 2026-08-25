#!/usr/bin/env node
/**
 * One-off cleanup for the 2026-08-24 logistics jobs rebuild.
 *
 * The old `LogisticsJob` schema (pickups[], crew[], planStatus, itemRequests, …) and the
 * `VehicleBooking` collection are incompatible with the new simplified schema. This drops both
 * collections and any `logistics`/`pickup` ScheduleEntry rows left over from the old per-round
 * HR sync, so the app starts clean on the new schema instead of holding orphaned documents.
 *
 * This is DESTRUCTIVE — it deletes all existing shipment/job data. Review what you're pointing
 * it at before running. Refuses to run against the production DB name unless explicitly told to.
 *
 *   MONGODB_URI=mongodb://host:27017/ MONGODB_DB_NAME=sakkmed_crm \
 *     node scripts/wipe-logistics-jobs.mjs --yes-production
 *
 *   MONGODB_URI=... MONGODB_DB_NAME=sakkmed_crm_dev node scripts/wipe-logistics-jobs.mjs
 */
import { createRequire } from 'node:module';
import process from 'node:process';

const PROTECTED_DBS = new Set(['sakkmed_crm']);

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const allowProduction = process.argv.includes('--yes-production');

if (!uri || !dbName) {
  console.error('Set MONGODB_URI and MONGODB_DB_NAME.');
  process.exit(1);
}
if (PROTECTED_DBS.has(dbName) && !allowProduction) {
  console.error(
    `Refusing to touch ${dbName} (production) without --yes-production. Make sure you mean it.`
  );
  process.exit(1);
}

const require = createRequire(new URL('../packages/db-core/package.json', import.meta.url));
const mongoose = require('mongoose');
const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 15000 });

async function dropIfExists(db, name) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) return { dropped: false, count: 0 };
  const count = await db.collection(name).countDocuments();
  await db.collection(name).drop();
  return { dropped: true, count };
}

async function main() {
  await client.connect();
  const db = client.db(dbName);

  const jobs = await dropIfExists(db, 'logisticsjobs');
  const bookings = await dropIfExists(db, 'vehiclebookings');

  const scheduleEntries = db.collection('scheduleentries');
  const staleSchedule = await scheduleEntries.deleteMany({ 'sourceRef.module': 'logistics' });

  console.log({
    dbName,
    logisticsjobs: jobs,
    vehiclebookings: bookings,
    staleScheduleEntriesRemoved: staleSchedule.deletedCount,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.close());
