import { connectDB, Company, Employee, ScheduleEntry, TimeOff } from '@crm/db-core';
import { eachDayInRange, dedupeDates, daysByMonthInYear, formatDatesLabel } from '@crm/lib';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { listLeaveYears } from './leave-years';

export const MONTH_NAMES = [
  'Január',
  'Február',
  'Március',
  'Április',
  'Május',
  'Június',
  'Július',
  'Augusztus',
  'Szeptember',
  'Október',
  'November',
  'December',
] as const;

export type LeaveMonthCell = {
  days: number;
  datesLabel: string;
  sickLabel?: string;
};

export type LeaveSummaryRow = {
  employeeId: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  entitlementDays: number;
  usedHolidayDays: number;
  remainingDays: number;
  months: Record<number, LeaveMonthCell>;
};

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export function collectOffDaysFromEntries(
  entries: Array<{ start: Date; end: Date; title?: string }>,
  year: number,
  kind: 'holiday' | 'sick'
): Date[] {
  const dates: Date[] = [];
  for (const e of entries) {
    const title = (e.title ?? '').toLowerCase();
    const isHoliday = title.includes('szabadság') && !title.includes('beteg');
    const isSick =
      title.includes('beteg') || title.includes('táppénz') || title.includes('tappenz');
    if (kind === 'holiday' && !isHoliday) continue;
    if (kind === 'sick' && !isSick) continue;
    for (const d of eachDayInRange(e.start, e.end)) {
      if (d.getFullYear() === year) dates.push(d);
    }
  }
  return dates;
}

export function collectTimeOffDays(
  requests: Array<{ type: string; start: Date; end: Date }>,
  year: number,
  kind: 'holiday' | 'sick'
): Date[] {
  const dates: Date[] = [];
  for (const req of requests) {
    const want = kind === 'holiday' ? 'leave' : 'sick';
    if (req.type !== want) continue;
    for (const d of eachDayInRange(req.start, req.end)) {
      if (d.getFullYear() === year) dates.push(d);
    }
  }
  return dates;
}

export function computeRemainingDays(entitlementDays: number, usedHolidayDays: number): number {
  return entitlementDays - usedHolidayDays;
}

export async function buildLeaveSummary(options: {
  year: number;
  companyId?: Types.ObjectId | string;
}): Promise<LeaveSummaryRow[]> {
  await connectDB();
  const { year, companyId } = options;

  const empFilter: Record<string, unknown> = { isActive: true };
  if (companyId) empFilter.companyId = toOid(companyId);

  const employees = await Employee.find(empFilter).sort({ name: 1 }).lean().exec();
  if (!employees.length) return [];

  const employeeIds = employees.map((e) => e._id);
  const companyIds = [...new Set(employees.map((e) => e.companyId.toString()))];

  const [companies, leaveYears, approvedRequests, offEntries] = await Promise.all([
    Company.find({ _id: { $in: companyIds } })
      .select({ name: 1 })
      .lean()
      .exec(),
    listLeaveYears({
      year,
      companyId,
      employeeIds,
    }),
    TimeOff.find({
      employeeId: { $in: employeeIds },
      status: 'approved',
      type: { $in: ['leave', 'sick'] },
    })
      .lean()
      .exec(),
    ScheduleEntry.find({
      employeeId: { $in: employeeIds },
      kind: 'off',
      start: { $lte: new Date(year, 11, 31, 23, 59, 59) },
      end: { $gte: new Date(year, 0, 1) },
    })
      .lean()
      .exec(),
  ]);

  const companyMap = new Map(companies.map((c) => [c._id.toString(), c.name]));
  const entitlementMap = new Map(leaveYears.map((ly) => [ly.employeeId.toString(), ly]));

  return employees.map((emp) => {
    const empId = emp._id.toString();
    const empRequests = approvedRequests
      .filter((r) => r.employeeId.toString() === empId)
      .map((r) => ({ type: r.type, start: new Date(r.start), end: new Date(r.end) }));
    const empOffEntries = offEntries
      .filter((e) => e.employeeId.toString() === empId)
      .map((e) => ({ start: new Date(e.start), end: new Date(e.end), title: e.title }));

    const holidayDates = dedupeDates([
      ...collectTimeOffDays(empRequests, year, 'holiday'),
      ...collectOffDaysFromEntries(empOffEntries, year, 'holiday'),
    ]);
    const sickDates = dedupeDates([
      ...collectTimeOffDays(empRequests, year, 'sick'),
      ...collectOffDaysFromEntries(empOffEntries, year, 'sick'),
    ]);

    const holidayByMonth = daysByMonthInYear(holidayDates, year);
    const sickByMonth = daysByMonthInYear(sickDates, year);

    const months: Record<number, LeaveMonthCell> = {};
    for (let m = 1; m <= 12; m++) {
      const h = holidayByMonth[m]!;
      const s = sickByMonth[m]!;
      months[m] = {
        days: h.count,
        datesLabel: h.datesLabel,
        sickLabel:
          s.count > 0
            ? s.datesLabel ||
              formatDatesLabel(sickDates.filter((d) => d.getMonth() + 1 === m)) ||
              'beteg'
            : undefined,
      };
    }

    const entitlement = entitlementMap.get(empId)?.entitlementDays ?? 0;
    const usedHolidayDays = holidayDates.length;

    return {
      employeeId: empId,
      employeeName: emp.name,
      companyId: emp.companyId.toString(),
      companyName: companyMap.get(emp.companyId.toString()) ?? '—',
      entitlementDays: entitlement,
      usedHolidayDays,
      remainingDays: computeRemainingDays(entitlement, usedHolidayDays),
      months,
    };
  });
}

export async function getRemainingLeaveDays(
  employeeId: Types.ObjectId | string,
  year: number
): Promise<{ entitlementDays: number; usedHolidayDays: number; remainingDays: number }> {
  await connectDB();
  const emp = await Employee.findById(
    typeof employeeId === 'string' ? new mongoose.Types.ObjectId(employeeId) : employeeId
  )
    .select({ companyId: 1 })
    .lean()
    .exec();
  if (!emp) {
    return { entitlementDays: 0, usedHolidayDays: 0, remainingDays: 0 };
  }
  const rows = await buildLeaveSummary({ year, companyId: emp.companyId });
  const row = rows.find((r) => r.employeeId === String(employeeId));
  if (!row) {
    return { entitlementDays: 0, usedHolidayDays: 0, remainingDays: 0 };
  }
  return {
    entitlementDays: row.entitlementDays,
    usedHolidayDays: row.usedHolidayDays,
    remainingDays: row.remainingDays,
  };
}
