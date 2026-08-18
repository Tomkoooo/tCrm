#!/usr/bin/env node
/**
 * Additive migration for a CLONE of main-branch Mongo onto rebuild schemas.
 * Never writes to production (`sakkmed_crm`).
 *
 *   MONGODB_URI=mongodb://host:27017/ MONGODB_DB_NAME=sakkmed_crm_rebuild \
 *     node scripts/migrate-rebuild-from-main.mjs
 */
import { createRequire } from 'node:module';
import process from 'node:process';

const PROTECTED_DBS = new Set(['sakkmed_crm']);

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();

if (!uri || !dbName) {
  console.error('Set MONGODB_URI and MONGODB_DB_NAME.');
  process.exit(1);
}
if (PROTECTED_DBS.has(dbName)) {
  console.error(`Refusing to migrate ${dbName} (production). Restore a clone first.`);
  process.exit(1);
}

const require = createRequire(new URL('../packages/db-core/package.json', import.meta.url));
const mongoose = require('mongoose');

const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 15000 });

function keysOf(doc) {
  return doc ? Object.keys(doc).sort() : [];
}

async function main() {
  await client.connect();
  const db = client.db(dbName);
  const employees = db.collection('employees');
  const schedule = db.collection('scheduleentries');
  const jobs = db.collection('logisticsjobs');
  const hrrequests = db.collection('hrrequests');
  const timeoffs = db.collection('timeoffs');
  const users = db.collection('users');
  const companies = db.collection('companies');

  const sampleEmp = await employees.findOne({});
  const sampleReq = await hrrequests.findOne({});
  const sampleJob = await jobs.findOne({});
  const sampleOff = await schedule.findOne({ kind: 'off' }, { projection: { title: 1, kind: 1 } });
  const offTitles = await schedule.distinct('title', { kind: 'off' });
  const kinds = await schedule.aggregate([{ $group: { _id: '$kind', n: { $sum: 1 } } }]).toArray();
  const userKeys = keysOf(await users.findOne({}, { projection: { passwordHash: 0, resetToken: 0 } }));
  const companyKeys = keysOf(await companies.findOne({}));

  console.log('db', dbName);
  console.log('employee keys', keysOf(sampleEmp));
  console.log('user keys', userKeys);
  console.log('company keys', companyKeys);
  console.log('schedule kinds', kinds);
  console.log('off titles', offTitles.slice(0, 20));
  console.log('sample off', sampleOff);
  console.log('hrrequest keys', keysOf(sampleReq), sampleReq ? { type: sampleReq.type, status: sampleReq.status } : null);
  console.log(
    'job pickup keys',
    sampleJob?.pickups?.[0] ? Object.keys(sampleJob.pickups[0]).sort() : []
  );

  const shiftEmpIds = await schedule.distinct('employeeId', { kind: 'shift' });
  const roster = await employees.updateMany(
    { _id: { $in: shiftEmpIds } },
    { $set: { scheduleMode: 'roster' } }
  );
  const logistics = await employees.updateMany(
    { $or: [{ scheduleMode: { $exists: false } }, { scheduleMode: null }] },
    { $set: { scheduleMode: 'logistics' } }
  );

  const withHrNotes = await employees
    .find({
      hrNotes: { $type: 'string', $ne: '' },
      $or: [{ notes: { $exists: false } }, { notes: null }, { notes: '' }],
    })
    .toArray();
  let notesCopied = 0;
  for (const emp of withHrNotes) {
    await employees.updateOne({ _id: emp._id }, { $set: { notes: emp.hrNotes } });
    notesCopied += 1;
  }

  const userToEmployee = new Map();
  for await (const emp of employees.find(
    { userId: { $type: 'objectId' }, isActive: { $ne: false } },
    { projection: { userId: 1 } }
  )) {
    const uid = String(emp.userId);
    if (!userToEmployee.has(uid)) userToEmployee.set(uid, emp._id);
  }

  let pickupsPatched = 0;
  for await (const job of jobs.find({})) {
    let changed = false;
    const pickups = (job.pickups ?? []).map((p) => {
      const existing = Array.isArray(p.employeeIds) ? p.employeeIds : [];
      if (existing.length) return p;
      const mapped = (p.teamMemberIds ?? [])
        .map((uid) => userToEmployee.get(String(uid)))
        .filter(Boolean);
      if (!mapped.length) return p;
      changed = true;
      pickupsPatched += 1;
      return { ...p, employeeIds: mapped };
    });
    const set = { pickups };
    if (!job.planStatus) {
      set.planStatus = pickups.length ? 'locked' : 'draft';
      changed = true;
    }
    if (changed) {
      await jobs.updateOne({ _id: job._id }, { $set: set });
    }
  }

  const statusMap = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  };

  let timeOffCopied = 0;
  let scheduleChangeCopied = 0;
  const changeReqs = db.collection('schedulechangerequests');
  for await (const req of hrrequests.find({})) {
    const typeRaw = String(req.type ?? '').toLowerCase();
    const payload = req.payload && typeof req.payload === 'object' ? req.payload : {};
    const status = statusMap[String(req.status ?? '').toLowerCase()] ?? 'pending';
    const companyId = req.companyId;
    if (!req.employeeId || !companyId) continue;

    if (typeRaw === 'holiday' || typeRaw === 'leave' || typeRaw === 'sick') {
      const start = payload.startDate ?? req.start;
      const end = payload.endDate ?? req.end;
      if (!start || !end) continue;
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const leaveType = typeRaw === 'sick' ? 'sick' : 'leave';
      const dup = await timeoffs.findOne({
        $or: [
          { migratedFromHrRequestId: req._id },
          { employeeId: req.employeeId, start: startDate, end: endDate, type: leaveType },
        ],
      });
      if (dup) continue;
      await timeoffs.insertOne({
        employeeId: req.employeeId,
        companyId,
        type: leaveType,
        status,
        start: startDate,
        end: endDate,
        note: typeof payload.note === 'string' ? payload.note : payload.reason,
        requestedBy: req.requestedByUserId ?? req.requestedBy,
        reviewedBy: req.reviewedByUserId ?? req.reviewedBy,
        reviewedAt: req.reviewedAt,
        createdAt: req.createdAt ?? new Date(),
        updatedAt: req.updatedAt ?? new Date(),
        migratedFromHrRequestId: req._id,
      });
      timeOffCopied += 1;
      continue;
    }

    if (typeRaw === 'schedule_change' && payload.scheduleEntryId) {
      const dup = await changeReqs.findOne({
        $or: [
          { migratedFromHrRequestId: req._id },
          { scheduleEntryId: payload.scheduleEntryId, employeeId: req.employeeId },
        ],
      });
      if (dup) continue;
      const origStart = payload.originalStart;
      const origEnd = payload.originalEnd;
      const propStart = payload.proposedStart;
      const propEnd = payload.proposedEnd;
      if (!origStart || !origEnd || !propStart || !propEnd) continue;
      await changeReqs.insertOne({
        employeeId: req.employeeId,
        companyId,
        scheduleEntryId: payload.scheduleEntryId,
        status,
        originalStart: origStart instanceof Date ? origStart : new Date(origStart),
        originalEnd: origEnd instanceof Date ? origEnd : new Date(origEnd),
        proposedStart: propStart instanceof Date ? propStart : new Date(propStart),
        proposedEnd: propEnd instanceof Date ? propEnd : new Date(propEnd),
        note: typeof payload.reason === 'string' ? payload.reason : undefined,
        requestedBy: req.requestedByUserId ?? req.requestedBy,
        reviewedBy: req.reviewedByUserId ?? req.reviewedBy,
        reviewedAt: req.reviewedAt,
        createdAt: req.createdAt ?? new Date(),
        updatedAt: req.updatedAt ?? new Date(),
        migratedFromHrRequestId: req._id,
      });
      scheduleChangeCopied += 1;
    }
  }

  const modeCounts = await employees
    .aggregate([{ $group: { _id: '$scheduleMode', n: { $sum: 1 } } }])
    .toArray();

  console.log({
    rosterSet: roster.modifiedCount,
    logisticsSet: logistics.modifiedCount,
    notesCopied,
    pickupsPatched,
    timeOffCopied,
    scheduleChangeCopied,
    modeCounts,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.close());
