import {
  connectDB,
  Company,
  Employee,
  HrRequest,
  ScheduleEntry,
  monthlyWorkSummaryRepository,
  employeeLeaveYearRepository,
  type EmployeePayType,
} from '@crm/db';
import { calculateEmployeeGrossPay } from '@crm/lib';
import type { Types } from 'mongoose';
import {
  collectOffDaysFromEntries,
  collectRequestDays,
  countWorkedHoursFromShifts,
  dedupeDates,
  formatDatesLabel,
} from './attendance';

export type MonthlyKimutatasRow = {
  employeeId: string;
  employeeName: string;
  companyId: string;
  companyName: string;
  entitlementDays: number;
  usedHolidayDaysYtd: number;
  remainingDays: number;
  payType?: EmployeePayType | null;
  monthlySalaryHuf?: number;
  hourlyRateHuf?: number;
  workedHours: number;
  holidayDays: number;
  sickDays: number;
  sickPayAmount?: number;
  notes?: string;
  scheduleWorkedHours: number;
  scheduleHolidayDays: number;
  scheduleSickDays: number;
  holidayDatesLabel: string;
  sickDatesLabel: string;
  grossPayHuf: number | null;
  hasSavedSummary: boolean;
};

export async function buildMonthlyKimutatasRows(options: {
  year: number;
  month: number;
  companyId?: Types.ObjectId;
  allowedCompanyIds: Types.ObjectId[] | null;
}): Promise<MonthlyKimutatasRow[]> {
  await connectDB();
  const { year, month, companyId, allowedCompanyIds } = options;

  const empFilter: Record<string, unknown> = { isActive: true };
  if (companyId) empFilter.companyId = companyId;
  else if (allowedCompanyIds !== null) {
    if (!allowedCompanyIds.length) return [];
    empFilter.companyId = { $in: allowedCompanyIds };
  }

  const employees = await Employee.find(empFilter).sort({ name: 1 }).lean().exec();
  if (!employees.length) return [];

  const employeeIds = employees.map((e) => e._id);
  const companyIds = [...new Set(employees.map((e) => e.companyId.toString()))];
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const [companies, leaveYears, summaries, approvedRequests, shiftEntries, offEntries] =
    await Promise.all([
      Company.find({ _id: { $in: companyIds } })
        .select({ name: 1 })
        .lean()
        .exec(),
      employeeLeaveYearRepository.findForYear({
        year,
        companyId,
        employeeIds,
        allowedCompanyIds,
      }),
      monthlyWorkSummaryRepository.findForPeriod({
        year,
        month,
        companyId,
        allowedCompanyIds,
      }),
      HrRequest.find({
        employeeId: { $in: employeeIds },
        status: 'approved',
        type: { $in: ['holiday', 'sick_leave'] },
      })
        .lean()
        .exec(),
      ScheduleEntry.find({
        employeeId: { $in: employeeIds },
        kind: 'shift',
        start: { $lt: monthEnd },
        end: { $gt: monthStart },
      })
        .lean()
        .exec(),
      ScheduleEntry.find({
        employeeId: { $in: employeeIds },
        kind: 'off',
        start: { $lte: yearEnd },
        end: { $gte: yearStart },
      })
        .lean()
        .exec(),
    ]);

  const companyMap = new Map(companies.map((c) => [c._id.toString(), c.name]));
  const entitlementMap = new Map(leaveYears.map((ly) => [ly.employeeId.toString(), ly]));
  const summaryMap = new Map(summaries.map((s) => [s.employeeId.toString(), s]));

  return employees.map((emp) => {
    const empId = emp._id.toString();
    const empRequests = approvedRequests.filter((r) => r.employeeId.toString() === empId);
    const empOffEntries = offEntries
      .filter((e) => e.employeeId.toString() === empId)
      .map((e) => ({ start: new Date(e.start), end: new Date(e.end), title: e.title }));
    const empShifts = shiftEntries
      .filter((e) => e.employeeId.toString() === empId)
      .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }));

    const ytdHolidayDates = dedupeDates([
      ...collectRequestDays(empRequests, year, 'holiday'),
      ...collectOffDaysFromEntries(empOffEntries, year, 'holiday'),
    ]);
    const monthHolidayDates = dedupeDates([
      ...collectRequestDays(empRequests, year, 'holiday', month),
      ...collectOffDaysFromEntries(empOffEntries, year, 'holiday', month),
    ]);
    const monthSickDates = dedupeDates([
      ...collectRequestDays(empRequests, year, 'sick', month),
      ...collectOffDaysFromEntries(empOffEntries, year, 'sick', month),
    ]);

    const scheduleWorkedHours = countWorkedHoursFromShifts(empShifts, emp.contractedWeeklyHours);
    const scheduleHolidayDays = monthHolidayDates.length;
    const scheduleSickDays = monthSickDates.length;

    const saved = summaryMap.get(empId);
    const hasSavedSummary = saved != null;
    const workedHours = saved?.workedHours ?? scheduleWorkedHours;
    const holidayDays = saved?.holidayDays ?? scheduleHolidayDays;
    const sickDays = saved?.sickDays ?? scheduleSickDays;
    const sickPayAmount = saved?.sickPayAmount;
    const notes = saved?.notes;

    const entitlement = entitlementMap.get(empId)?.entitlementDays ?? 0;
    const usedHolidayDaysYtd = ytdHolidayDates.length;

    const grossPayHuf = calculateEmployeeGrossPay({
      payType: emp.payType,
      monthlySalaryHuf: emp.monthlySalaryHuf,
      hourlyRateHuf: emp.hourlyRateHuf,
      workedHours,
      sickPayAmount,
    });

    return {
      employeeId: empId,
      employeeName: emp.name,
      companyId: emp.companyId.toString(),
      companyName: companyMap.get(emp.companyId.toString()) ?? '—',
      entitlementDays: entitlement,
      usedHolidayDaysYtd,
      remainingDays: entitlement - usedHolidayDaysYtd,
      payType: emp.payType,
      monthlySalaryHuf: emp.monthlySalaryHuf,
      hourlyRateHuf: emp.hourlyRateHuf,
      workedHours,
      holidayDays,
      sickDays,
      sickPayAmount,
      notes,
      scheduleWorkedHours,
      scheduleHolidayDays,
      scheduleSickDays,
      holidayDatesLabel: formatDatesLabel(monthHolidayDates),
      sickDatesLabel: formatDatesLabel(monthSickDates),
      grossPayHuf,
      hasSavedSummary,
    };
  });
}

export async function suggestMonthlyFromSchedule(
  employeeId: Types.ObjectId,
  year: number,
  month: number
): Promise<{
  workedHours: number;
  holidayDays: number;
  sickDays: number;
  holidayDatesLabel: string;
  sickDatesLabel: string;
}> {
  await connectDB();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const [emp, shiftEntries, offEntries, approvedRequests] = await Promise.all([
    Employee.findById(employeeId).select({ contractedWeeklyHours: 1 }).lean().exec(),
    ScheduleEntry.find({
      employeeId,
      kind: 'shift',
      start: { $lt: monthEnd },
      end: { $gt: monthStart },
    })
      .lean()
      .exec(),
    ScheduleEntry.find({
      employeeId,
      kind: 'off',
      start: { $lte: yearEnd },
      end: { $gte: yearStart },
    })
      .lean()
      .exec(),
    HrRequest.find({
      employeeId,
      status: 'approved',
      type: { $in: ['holiday', 'sick_leave'] },
    })
      .lean()
      .exec(),
  ]);

  const offMapped = offEntries.map((e) => ({
    start: new Date(e.start),
    end: new Date(e.end),
    title: e.title,
  }));
  const shifts = shiftEntries.map((e) => ({
    start: new Date(e.start),
    end: new Date(e.end),
  }));

  const monthHolidayDates = dedupeDates([
    ...collectRequestDays(approvedRequests, year, 'holiday', month),
    ...collectOffDaysFromEntries(offMapped, year, 'holiday', month),
  ]);
  const monthSickDates = dedupeDates([
    ...collectRequestDays(approvedRequests, year, 'sick', month),
    ...collectOffDaysFromEntries(offMapped, year, 'sick', month),
  ]);

  return {
    workedHours: countWorkedHoursFromShifts(shifts, emp?.contractedWeeklyHours),
    holidayDays: monthHolidayDates.length,
    sickDays: monthSickDates.length,
    holidayDatesLabel: formatDatesLabel(monthHolidayDates),
    sickDatesLabel: formatDatesLabel(monthSickDates),
  };
}
