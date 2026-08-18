import { connectDB, Employee, ScheduleEntry, TimeOff } from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

export type MonthlyHoursRow = {
  employeeId: string;
  name: string;
  email?: string;
  /** Total overlapping job hours in the month. */
  hours: number;
  jobCount: number;
};

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { start, end };
}

/** Overlap duration in hours between [start,end] and the month window. */
export function overlapHours(
  entryStart: Date,
  entryEnd: Date,
  windowStart: Date,
  windowEnd: Date
): number {
  const start = Math.max(entryStart.getTime(), windowStart.getTime());
  const end = Math.min(entryEnd.getTime(), windowEnd.getTime());
  if (end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

/**
 * Monthly hours = sum of (end - start) for kind=job and kind=shift entries overlapping the month.
 */
export async function getMonthlyHours(params: {
  year: number;
  month: number;
  employeeId?: Types.ObjectId | string;
  companyId?: Types.ObjectId | string;
}): Promise<MonthlyHoursRow[]> {
  await connectDB();
  const { start, end } = monthBounds(params.year, params.month);

  const filter: Record<string, unknown> = {
    kind: { $in: ['job', 'shift'] },
    start: { $lt: end },
    end: { $gt: start },
  };
  if (params.employeeId) {
    filter.employeeId =
      typeof params.employeeId === 'string'
        ? new mongoose.Types.ObjectId(params.employeeId)
        : params.employeeId;
  }
  if (params.companyId) {
    filter.companyId =
      typeof params.companyId === 'string'
        ? new mongoose.Types.ObjectId(params.companyId)
        : params.companyId;
  }

  const entries = await ScheduleEntry.find(filter).lean().exec();
  const byEmployee = new Map<string, { hours: number; jobCount: number }>();

  for (const entry of entries) {
    const key = String(entry.employeeId);
    const hours = overlapHours(entry.start, entry.end, start, end);
    const current = byEmployee.get(key) ?? { hours: 0, jobCount: 0 };
    current.hours += hours;
    current.jobCount += 1;
    byEmployee.set(key, current);
  }

  const employeeIds = [...byEmployee.keys()].map((id) => new mongoose.Types.ObjectId(id));
  const employees = await Employee.find({ _id: { $in: employeeIds } })
    .select({ name: 1, email: 1 })
    .lean()
    .exec();
  const nameMap = new Map(employees.map((e) => [String(e._id), e]));

  const rows: MonthlyHoursRow[] = [];
  for (const [employeeId, stats] of byEmployee) {
    const emp = nameMap.get(employeeId);
    rows.push({
      employeeId,
      name: emp?.name ?? employeeId,
      email: emp?.email,
      hours: Math.round(stats.hours * 100) / 100,
      jobCount: stats.jobCount,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, 'hu'));
  return rows;
}

export async function getHrDashboardSummary(): Promise<{
  peopleCount: number;
  pendingLeaveCount: number;
  jobsThisWeekCount: number;
}> {
  await connectDB();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [peopleCount, pendingLeaveCount, jobsThisWeekCount] = await Promise.all([
    Employee.countDocuments({ isActive: true }).exec(),
    TimeOff.countDocuments({ status: 'pending' }).exec(),
    ScheduleEntry.countDocuments({
      kind: 'job',
      start: { $lt: weekEnd },
      end: { $gt: now },
    }).exec(),
  ]);

  return { peopleCount, pendingLeaveCount, jobsThisWeekCount };
}
