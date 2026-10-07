import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestMongo } from '@crm/test-utils/mongo-memory';
import {
  Company,
  Employee,
  MagicLink,
  ScheduleChangeRequest,
  ScheduleEntry,
  SchedulePlan,
  User,
  connectDB,
} from '@crm/db-core';
import { formatHrTime, parseHrDateOnly, parseHrDateTime } from '@crm/lib';
import {
  cellKey,
  clearPlanCell,
  createSchedulePlan,
  deleteSchedulePlan,
  getSchedulePlanGrid,
  listPlanEntries,
  updateSchedulePlan,
  upsertPlanCell,
} from './schedule-plans';
import {
  buildEmployeeScheduleTableHtml,
  describeUnreachableEmployees,
  ensureEmployeeCalendarToken,
  publishSchedulePlan,
} from './schedule-notify';
import {
  listPlanChangeRequests,
  reviewScheduleChangeRequest,
  submitScheduleChangeRequest,
} from './schedule-change';
import { buildEmployeeCalendarFeed, findEmployeeByCalendarToken } from './schedule-ics';
import { listScheduleEntries } from './schedule';

let mongo: MongoMemoryServer;

let companyId: mongoose.Types.ObjectId;
let plannerId: mongoose.Types.ObjectId;
let aliceUserId: mongoose.Types.ObjectId;
let aliceId: mongoose.Types.ObjectId;
let bobId: mongoose.Types.ObjectId;
let carolId: mongoose.Types.ObjectId;

const START = '2026-10-05'; // Monday
const END = '2026-10-11'; // Sunday

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  // No SMTP in tests: sendTemplatedEmail reports "skipped", so publish runs end to
  // end (magic links, tokens, rendering) without any mail leaving the process.
  delete process.env.SMTP_HOST;
  process.env.APP_URL = 'https://crm.example.test';
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    Company.deleteMany({}),
    Employee.deleteMany({}),
    User.deleteMany({}),
    SchedulePlan.deleteMany({}),
    ScheduleEntry.deleteMany({}),
    ScheduleChangeRequest.deleteMany({}),
    MagicLink.deleteMany({}),
  ]);

  const company = await Company.create({ name: 'Teszt Kft.', slug: 'teszt', isActive: true });
  companyId = company._id;

  const planner = await User.create({
    email: 'planner@example.test',
    name: 'Beosztó',
    passwordHash: 'x',
    isActive: true,
  });
  plannerId = planner._id;

  const aliceUser = await User.create({
    email: 'alice@example.test',
    name: 'Alice',
    passwordHash: 'x',
    isActive: true,
  });
  aliceUserId = aliceUser._id;

  // Alice: full contact + CRM login → reachable.
  const alice = await Employee.create({
    companyId,
    name: 'Alice',
    email: 'alice@example.test',
    userId: aliceUserId,
    scheduleMode: 'logistics',
    isActive: true,
  });
  aliceId = alice._id;

  // Bob: e-mail but no CRM login → cannot get a magic link.
  const bob = await Employee.create({
    companyId,
    name: 'Bob',
    email: 'bob@example.test',
    scheduleMode: 'logistics',
    isActive: true,
  });
  bobId = bob._id;

  // Carol: no e-mail at all.
  const carol = await Employee.create({
    companyId,
    name: 'Carol',
    scheduleMode: 'logistics',
    isActive: true,
  });
  carolId = carol._id;
});

async function makePlan(employeeIds = [aliceId, bobId, carolId]) {
  return createSchedulePlan({
    companyId,
    title: 'Októberi beosztás',
    startDateKey: START,
    endDateKey: END,
    employeeIds,
    actorUserId: plannerId,
  });
}

describe('createSchedulePlan', () => {
  it('creates a draft spanning the requested days', async () => {
    const plan = await makePlan();
    expect(plan.status).toBe('draft');
    expect(plan.publishCount).toBe(0);
    expect(plan.defaultShiftHours).toBe(8);
    expect(plan.defaultStartTime).toBe('08:00');

    const grid = await getSchedulePlanGrid(plan._id);
    expect(grid?.dayKeys).toHaveLength(7);
    expect(grid?.employees.map((e) => e.name)).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('preserves the chosen column order', async () => {
    const plan = await makePlan([carolId, aliceId, bobId]);
    const grid = await getSchedulePlanGrid(plan._id);
    expect(grid?.employees.map((e) => e.name)).toEqual(['Carol', 'Alice', 'Bob']);
  });

  it('rejects an inverted date range', async () => {
    await expect(
      createSchedulePlan({
        companyId,
        title: 'Rossz',
        startDateKey: END,
        endDateKey: START,
        employeeIds: [aliceId],
        actorUserId: plannerId,
      })
    ).rejects.toThrow(/korábbi/);
  });

  it('rejects an employee from another company', async () => {
    const other = await Company.create({ name: 'Másik', slug: 'masik', isActive: true });
    const outsider = await Employee.create({
      companyId: other._id,
      name: 'Kívülálló',
      scheduleMode: 'logistics',
      isActive: true,
    });
    await expect(
      createSchedulePlan({
        companyId,
        title: 'Rossz',
        startDateKey: START,
        endDateKey: END,
        employeeIds: [aliceId, outsider._id],
        actorUserId: plannerId,
      })
    ).rejects.toThrow(/céghez/);
  });

  it('requires at least one employee', async () => {
    await expect(
      createSchedulePlan({
        companyId,
        title: 'Üres',
        startDateKey: START,
        endDateKey: END,
        employeeIds: [],
        actorUserId: plannerId,
      })
    ).rejects.toThrow(/legalább egy/);
  });
});

describe('upsertPlanCell', () => {
  it('writes a shift at the Budapest wall-clock time', async () => {
    const plan = await makePlan();
    const entry = await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'BOK',
      startTime: '13:00',
      actorUserId: plannerId,
    });

    expect(formatHrTime(entry.start)).toBe('13:00');
    expect(formatHrTime(entry.end)).toBe('21:00'); // 8h default
    expect(entry.kind).toBe('shift');
    expect(entry.locationLabel).toBe('BOK');
    expect(entry.companyId.equals(companyId)).toBe(true);
  });

  it('tags the entry so the plan owns it', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });

    const entries = await listPlanEntries(plan._id);
    expect(entries).toHaveLength(1);
    const ref = entries[0]!.sourceRef as { module: string; refType: string };
    expect(ref.module).toBe('hr');
    expect(ref.refType).toBe('plan');
  });

  it('overwrites rather than duplicating the same employee-day cell', async () => {
    const plan = await makePlan();
    for (const time of ['08:00', '09:00', '10:30']) {
      await upsertPlanCell({
        planId: plan._id,
        employeeId: aliceId,
        dayKey: '2026-10-06',
        place: 'Kispest',
        startTime: time,
        actorUserId: plannerId,
      });
    }
    const entries = await listPlanEntries(plan._id);
    expect(entries).toHaveLength(1);
    expect(formatHrTime(entries[0]!.start)).toBe('10:30');
  });

  it('honours an explicit end time', async () => {
    const plan = await makePlan();
    const entry = await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      endTime: '12:00',
      actorUserId: plannerId,
    });
    expect(formatHrTime(entry.end)).toBe('12:00');
  });

  it('defaults both times from the plan when only a place is given', async () => {
    const plan = await createSchedulePlan({
      companyId,
      title: 'Alapértékek',
      startDateKey: START,
      endDateKey: END,
      employeeIds: [aliceId],
      defaultStartTime: '06:30',
      defaultShiftHours: 7.5,
      actorUserId: plannerId,
    });

    const entry = await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      actorUserId: plannerId,
    });

    expect(formatHrTime(entry.start)).toBe('06:30');
    expect(formatHrTime(entry.end)).toBe('14:00');
  });

  it('stores an overnight shift as ending the next day', async () => {
    const plan = await makePlan();
    const entry = await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'BOK',
      startTime: '22:00',
      endTime: '02:00',
      actorUserId: plannerId,
    });

    expect(entry.end.getTime() - entry.start.getTime()).toBe(4 * 60 * 60 * 1000);

    const grid = await getSchedulePlanGrid(plan._id);
    const cell = grid!.cells.get(cellKey(String(aliceId), '2026-10-06'));
    expect(cell?.overnight).toBe(true);
    expect(cell?.hours).toBe(4);
  });

  it('stores the description separately from the place', async () => {
    const plan = await makePlan();
    const entry = await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'BOK',
      description: 'Színpad bontás, 3 fő',
      actorUserId: plannerId,
    });

    expect(entry.locationLabel).toBe('BOK');
    expect(entry.notes).toBe('Színpad bontás, 3 fő');
  });

  it('rejects a cell with no place', async () => {
    const plan = await makePlan();
    await expect(
      upsertPlanCell({
        planId: plan._id,
        employeeId: aliceId,
        dayKey: '2026-10-06',
        place: '   ',
        actorUserId: plannerId,
      })
    ).rejects.toThrow(/helyszín/i);
  });

  it('refuses a day outside the plan period', async () => {
    const plan = await makePlan();
    await expect(
      upsertPlanCell({
        planId: plan._id,
        employeeId: aliceId,
        dayKey: '2026-11-01',
        place: 'Kispest',
        startTime: '08:00',
        actorUserId: plannerId,
      })
    ).rejects.toThrow(/kívül esik/);
  });

  it('refuses an employee who is not a column of this plan', async () => {
    const plan = await makePlan([aliceId]);
    await expect(
      upsertPlanCell({
        planId: plan._id,
        employeeId: bobId,
        dayKey: '2026-10-06',
        place: 'Kispest',
        startTime: '08:00',
        actorUserId: plannerId,
      })
    ).rejects.toThrow(/nincs kiválasztva/);
  });

  it('refuses an invalid start time', async () => {
    const plan = await makePlan();
    await expect(
      upsertPlanCell({
        planId: plan._id,
        employeeId: aliceId,
        dayKey: '2026-10-06',
        place: 'Kispest',
        startTime: '25:00',
        actorUserId: plannerId,
      })
    ).rejects.toThrow(/Érvénytelen kezdési/);
  });
});

describe('clearPlanCell', () => {
  it('removes the shift for that employee and day only', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-07',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });

    expect(
      await clearPlanCell({ planId: plan._id, employeeId: aliceId, dayKey: '2026-10-06' })
    ).toBe(true);

    const entries = await listPlanEntries(plan._id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.start.getTime()).toBe(parseHrDateTime('2026-10-07T08:00:00').getTime());
  });

  it('reports false when there was nothing to clear', async () => {
    const plan = await makePlan();
    expect(
      await clearPlanCell({ planId: plan._id, employeeId: aliceId, dayKey: '2026-10-06' })
    ).toBe(false);
  });
});

describe('getSchedulePlanGrid', () => {
  it('keys cells by employee and day', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'BOK',
      startTime: '13:00',
      actorUserId: plannerId,
    });

    const grid = await getSchedulePlanGrid(plan._id);
    const cell = grid!.cells.get(cellKey(String(aliceId), '2026-10-06'));
    expect(cell?.place).toBe('BOK');
    expect(cell?.startTime).toBe('13:00');
    expect(cell?.endTime).toBe('21:00');
    expect(cell?.hours).toBe(8);
    expect(grid!.cells.get(cellKey(String(bobId), '2026-10-06'))).toBeUndefined();
  });

  it('returns null for an unknown plan id', async () => {
    expect(await getSchedulePlanGrid(new mongoose.Types.ObjectId())).toBeNull();
    expect(await getSchedulePlanGrid('not-an-object-id')).toBeNull();
  });
});

describe('updateSchedulePlan', () => {
  it('stores day notes against the right day', async () => {
    const plan = await makePlan();
    await updateSchedulePlan({
      id: plan._id,
      dayNotes: { '2026-10-06': ['Atlétika Épül', 'BoatShow Bont'] },
      actorUserId: plannerId,
    });

    const grid = await getSchedulePlanGrid(plan._id);
    expect(grid!.dayNotes.get('2026-10-06')).toEqual(['Atlétika Épül', 'BoatShow Bont']);
  });

  it('ignores notes for days outside the period', async () => {
    const plan = await makePlan();
    await updateSchedulePlan({
      id: plan._id,
      dayNotes: { '2027-01-01': ['Nope'] },
      actorUserId: plannerId,
    });
    const grid = await getSchedulePlanGrid(plan._id);
    expect(grid!.dayNotes.size).toBe(0);
  });

  it('deletes the shifts of an employee removed from the plan', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: bobId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });
    expect(await listPlanEntries(plan._id)).toHaveLength(2);

    await updateSchedulePlan({
      id: plan._id,
      employeeIds: [aliceId],
      actorUserId: plannerId,
    });

    const entries = await listPlanEntries(plan._id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.employeeId.equals(aliceId)).toBe(true);
  });
});

describe('deleteSchedulePlan', () => {
  it('removes the plan and every shift it owns', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });

    await deleteSchedulePlan(plan._id);

    expect(await SchedulePlan.findById(plan._id).exec()).toBeNull();
    expect(await ScheduleEntry.countDocuments({})).toBe(0);
  });

  it('leaves unrelated schedule entries alone', async () => {
    const plan = await makePlan();
    await ScheduleEntry.create({
      employeeId: aliceId,
      companyId,
      start: parseHrDateTime('2026-10-06T08:00:00'),
      end: parseHrDateTime('2026-10-06T16:00:00'),
      kind: 'job',
      title: 'Szállítás',
      createdBy: plannerId,
      updatedBy: plannerId,
    });

    await deleteSchedulePlan(plan._id);
    expect(await ScheduleEntry.countDocuments({})).toBe(1);
  });
});

describe('plan shifts and the rest of HR', () => {
  it('appear in the shared schedule listing the calendar and hours read', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });

    const entries = await listScheduleEntries({
      start: parseHrDateOnly('2026-10-01'),
      end: parseHrDateOnly('2026-11-01'),
      employeeId: aliceId,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.kind).toBe('shift');
  });
});

describe('publishSchedulePlan', () => {
  it('marks the plan published and stamps the send', async () => {
    const plan = await makePlan();
    const result = await publishSchedulePlan({ planId: plan._id, actorUserId: plannerId });

    expect(result.plan.status).toBe('published');
    expect(result.plan.publishCount).toBe(1);
    expect(result.plan.publishedAt).toBeInstanceOf(Date);
  });

  it('mints a magic link only for employees with a CRM login', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });

    const result = await publishSchedulePlan({ planId: plan._id, actorUserId: plannerId });
    const byName = new Map(result.recipients.map((r) => [r.employeeName, r]));

    expect(byName.get('Bob')?.skippedReason).toMatch(/CRM fiók/);
    expect(byName.get('Carol')?.skippedReason).toMatch(/e-mail/);

    const links = await MagicLink.find({}).exec();
    expect(links).toHaveLength(1);
    expect(links[0]!.userId.equals(aliceUserId)).toBe(true);
    expect(links[0]!.purpose).toBe('schedule');
    expect(links[0]!.redirectTo).toBe(`/hr/me/schedule/${String(plan._id)}`);
    // The raw token is never stored.
    expect(links[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('skips empty columns when asked', async () => {
    const plan = await makePlan();
    const result = await publishSchedulePlan({
      planId: plan._id,
      actorUserId: plannerId,
      skipEmptyColumns: true,
    });
    expect(result.recipients.every((r) => r.skippedReason)).toBe(true);
    expect(result.recipients.find((r) => r.employeeName === 'Alice')?.skippedReason).toMatch(
      /Nincs műszak/
    );
  });

  it('limits the send to the selected employees', async () => {
    const plan = await makePlan();
    const result = await publishSchedulePlan({
      planId: plan._id,
      actorUserId: plannerId,
      employeeIds: [String(aliceId)],
    });
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0]!.employeeName).toBe('Alice');
  });

  it('counts each re-publish so a resend can be labelled', async () => {
    const plan = await makePlan();
    await publishSchedulePlan({ planId: plan._id, actorUserId: plannerId });
    const second = await publishSchedulePlan({ planId: plan._id, actorUserId: plannerId });
    expect(second.plan.publishCount).toBe(2);
  });

  it('gives the employee a calendar feed token', async () => {
    const plan = await makePlan();
    await publishSchedulePlan({ planId: plan._id, actorUserId: plannerId });

    const alice = await Employee.findById(aliceId).exec();
    expect(alice?.calendarFeedToken).toMatch(/^[0-9a-f]{48}$/);
    expect(await findEmployeeByCalendarToken(alice!.calendarFeedToken!)).not.toBeNull();
  });
});

describe('buildEmployeeScheduleTableHtml', () => {
  it('renders every day of the period, marking days off', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'BOK',
      startTime: '13:00',
      actorUserId: plannerId,
    });
    await updateSchedulePlan({
      id: plan._id,
      dayNotes: { '2026-10-06': ['Atlétika Épül'] },
      actorUserId: plannerId,
    });

    const grid = await getSchedulePlanGrid(plan._id);
    const html = buildEmployeeScheduleTableHtml(grid!, String(aliceId));

    expect(html).toContain('BOK');
    expect(html).toContain('13:00–21:00');
    expect(html).toContain('Atlétika Épül');
    // 7 body rows, one per day of the period (the header row is <tr style> too).
    const body = html.slice(html.indexOf('<tbody>'));
    expect((body.match(/<tr /g) ?? []).length).toBe(7);
    expect(html).toContain('—'); // days off
  });

  it('shows only the recipient’s own column', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: bobId,
      dayKey: '2026-10-06',
      place: 'Titkos',
      startTime: '06:00',
      actorUserId: plannerId,
    });

    const grid = await getSchedulePlanGrid(plan._id);
    const html = buildEmployeeScheduleTableHtml(grid!, String(aliceId));
    expect(html).not.toContain('Titkos');
  });

  it('escapes HTML in notes and locations', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: '<script>alert(1)</script>',
      startTime: '08:00',
      actorUserId: plannerId,
    });

    const grid = await getSchedulePlanGrid(plan._id);
    const html = buildEmployeeScheduleTableHtml(grid!, String(aliceId));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('describeUnreachableEmployees', () => {
  it('names who cannot be mailed and why', async () => {
    const employees = await Employee.find({ companyId }).sort({ name: 1 }).exec();
    const result = describeUnreachableEmployees(employees);
    expect(result.map((r) => `${r.name}:${r.reason}`)).toEqual([
      'Bob:nincs CRM fiók',
      'Carol:nincs e-mail',
    ]);
  });
});

describe('schedule change requests', () => {
  async function planWithAliceShift() {
    const plan = await makePlan();
    const entry = await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'Kispest',
      startTime: '08:00',
      actorUserId: plannerId,
    });
    await publishSchedulePlan({ planId: plan._id, actorUserId: plannerId });
    return { plan, entry };
  }

  it('lets a logistics-mode employee request a change to a plan shift', async () => {
    const { entry } = await planWithAliceShift();

    const request = await submitScheduleChangeRequest({
      scheduleEntryId: entry._id,
      proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
      proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
      note: 'Orvosnál vagyok reggel',
      requestedBy: aliceUserId,
    });

    expect(request.status).toBe('pending');
    expect(request.originalStart.getTime()).toBe(entry.start.getTime());
  });

  it('refuses a request on somebody else’s shift', async () => {
    const { entry } = await planWithAliceShift();
    await expect(
      submitScheduleChangeRequest({
        scheduleEntryId: entry._id,
        proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
        proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
        requestedBy: plannerId,
      })
    ).rejects.toThrow(/saját/);
  });

  it('refuses a second open request on the same shift', async () => {
    const { entry } = await planWithAliceShift();
    const args = {
      scheduleEntryId: entry._id,
      proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
      proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
      requestedBy: aliceUserId,
    };
    await submitScheduleChangeRequest(args);
    await expect(submitScheduleChangeRequest(args)).rejects.toThrow(/már van/);
  });

  it('refuses an inverted proposal', async () => {
    const { entry } = await planWithAliceShift();
    await expect(
      submitScheduleChangeRequest({
        scheduleEntryId: entry._id,
        proposedStart: parseHrDateTime('2026-10-06T18:00:00'),
        proposedEnd: parseHrDateTime('2026-10-06T10:00:00'),
        requestedBy: aliceUserId,
      })
    ).rejects.toThrow(/Érvénytelen/);
  });

  it('moves the shift on approval and records the feedback', async () => {
    const { entry } = await planWithAliceShift();
    const request = await submitScheduleChangeRequest({
      scheduleEntryId: entry._id,
      proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
      proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
      requestedBy: aliceUserId,
    });

    const reviewed = await reviewScheduleChangeRequest(
      request._id,
      'approved',
      plannerId,
      'Rendben, átírtam.'
    );
    expect(reviewed.status).toBe('approved');
    expect(reviewed.reviewNote).toBe('Rendben, átírtam.');

    const updated = await ScheduleEntry.findById(entry._id).exec();
    expect(formatHrTime(updated!.start)).toBe('10:00');
    expect(formatHrTime(updated!.end)).toBe('18:00');
  });

  it('leaves the shift untouched on rejection', async () => {
    const { entry } = await planWithAliceShift();
    const request = await submitScheduleChangeRequest({
      scheduleEntryId: entry._id,
      proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
      proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
      requestedBy: aliceUserId,
    });

    await reviewScheduleChangeRequest(request._id, 'rejected', plannerId, 'Aznap kell a csapat.');

    const unchanged = await ScheduleEntry.findById(entry._id).exec();
    expect(formatHrTime(unchanged!.start)).toBe('08:00');
  });

  it('refuses to review the same request twice', async () => {
    const { entry } = await planWithAliceShift();
    const request = await submitScheduleChangeRequest({
      scheduleEntryId: entry._id,
      proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
      proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
      requestedBy: aliceUserId,
    });
    await reviewScheduleChangeRequest(request._id, 'approved', plannerId);
    await expect(reviewScheduleChangeRequest(request._id, 'rejected', plannerId)).rejects.toThrow(
      /már elbírálva/
    );
  });

  it('surfaces a plan’s requests to the planner', async () => {
    const { plan, entry } = await planWithAliceShift();
    await submitScheduleChangeRequest({
      scheduleEntryId: entry._id,
      proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
      proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
      requestedBy: aliceUserId,
    });

    const requests = await listPlanChangeRequests(plan._id);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.employeeId.equals(aliceId)).toBe(true);
  });

  it('does not allow a request on a logistics job entry', async () => {
    const job = await ScheduleEntry.create({
      employeeId: aliceId,
      companyId,
      start: parseHrDateTime('2026-10-06T08:00:00'),
      end: parseHrDateTime('2026-10-06T16:00:00'),
      kind: 'job',
      title: 'Szállítás',
      createdBy: plannerId,
      updatedBy: plannerId,
    });

    await expect(
      submitScheduleChangeRequest({
        scheduleEntryId: job._id,
        proposedStart: parseHrDateTime('2026-10-06T10:00:00'),
        proposedEnd: parseHrDateTime('2026-10-06T18:00:00'),
        requestedBy: aliceUserId,
      })
    ).rejects.toThrow(/Csak műszakra/);
  });
});

describe('calendar feed', () => {
  it('contains the employee’s plan shifts as VEVENTs', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: aliceId,
      dayKey: '2026-10-06',
      place: 'BOK',
      startTime: '13:00',
      actorUserId: plannerId,
    });

    const alice = await Employee.findById(aliceId).exec();
    await ensureEmployeeCalendarToken(alice!._id);
    const refreshed = await Employee.findById(aliceId).exec();

    const ics = await buildEmployeeCalendarFeed({
      employee: refreshed!,
      appUrl: 'https://crm.example.test',
      now: parseHrDateOnly('2026-10-05'),
    });

    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('LOCATION:BOK');
    expect(ics).toContain('REFRESH-INTERVAL');
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
  });

  it('never leaks another employee’s shifts', async () => {
    const plan = await makePlan();
    await upsertPlanCell({
      planId: plan._id,
      employeeId: bobId,
      dayKey: '2026-10-06',
      place: 'Titkos',
      startTime: '06:00',
      actorUserId: plannerId,
    });

    await ensureEmployeeCalendarToken(aliceId);
    const alice = await Employee.findById(aliceId).exec();
    const ics = await buildEmployeeCalendarFeed({
      employee: alice!,
      now: parseHrDateOnly('2026-10-05'),
    });

    expect(ics).not.toContain('Titkos');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('reuses the same token on repeat calls', async () => {
    const first = await ensureEmployeeCalendarToken(aliceId);
    const second = await ensureEmployeeCalendarToken(aliceId);
    expect(second).toBe(first);
  });

  it('rejects a bogus or too-short token', async () => {
    expect(await findEmployeeByCalendarToken('short')).toBeNull();
    expect(await findEmployeeByCalendarToken('0'.repeat(48))).toBeNull();
  });
});
