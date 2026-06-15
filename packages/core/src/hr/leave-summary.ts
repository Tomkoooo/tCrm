import {
  connectDB,
  Company,
  Employee,
  HrRequest,
  ScheduleEntry,
  employeeLeaveYearRepository,
  type IEmployee,
} from '@crm/db';
import { eachDayInRange } from '@crm/lib';
import type { Types } from 'mongoose';
import {
  collectOffDaysFromEntries,
  collectRequestDays,
  dedupeDates,
  daysByMonthInYear,
} from './attendance';

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
  workerCategory: 'regular' | 'occasional';
  entitlementDays: number;
  usedHolidayDays: number;
  remainingDays: number;
  months: Record<number, LeaveMonthCell>;
  personalData?: IEmployee['personalData'];
};

const MONTH_NAMES = [
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
];

export { MONTH_NAMES };

export async function buildLeaveSummary(options: {
  year: number;
  companyId?: Types.ObjectId;
  workerCategory?: 'regular' | 'occasional';
  allowedCompanyIds: Types.ObjectId[] | null;
}): Promise<LeaveSummaryRow[]> {
  await connectDB();
  const { year, companyId, workerCategory, allowedCompanyIds } = options;

  const empFilter: Record<string, unknown> = { isActive: true };
  if (workerCategory) empFilter.workerCategory = workerCategory;
  if (companyId) {
    empFilter.companyId = companyId;
  } else if (allowedCompanyIds !== null) {
    if (!allowedCompanyIds.length) return [];
    empFilter.companyId = { $in: allowedCompanyIds };
  }

  const employees = await Employee.find(empFilter).sort({ name: 1 }).lean().exec();
  if (!employees.length) return [];

  const employeeIds = employees.map((e) => e._id);
  const companyIds = [...new Set(employees.map((e) => e.companyId.toString()))];
  const [companies, leaveYears, approvedRequests, offEntries] = await Promise.all([
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
    HrRequest.find({
      employeeId: { $in: employeeIds },
      status: 'approved',
      type: { $in: ['holiday', 'sick_leave'] },
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
    const empRequests = approvedRequests.filter((r) => r.employeeId.toString() === empId);
    const empOffEntries = offEntries
      .filter((e) => e.employeeId.toString() === empId)
      .map((e) => ({ start: new Date(e.start), end: new Date(e.end), title: e.title }));

    const reqHolidayDates = collectRequestDays(empRequests, year, 'holiday');
    const reqSickDates = collectRequestDays(empRequests, year, 'sick');
    const entryHolidayDates = collectOffDaysFromEntries(empOffEntries, year, 'holiday');
    const entrySickDates = collectOffDaysFromEntries(empOffEntries, year, 'sick');

    const holidayDates = dedupeDates([...reqHolidayDates, ...entryHolidayDates]);
    const sickDates = dedupeDates([...reqSickDates, ...entrySickDates]);
    const holidayByMonth = daysByMonthInYear(holidayDates, year);
    const sickByMonth = daysByMonthInYear(sickDates, year);

    const months: Record<number, LeaveMonthCell> = {};
    for (let m = 1; m <= 12; m++) {
      const h = holidayByMonth[m]!;
      const s = sickByMonth[m]!;
      months[m] = {
        days: h.count,
        datesLabel: h.datesLabel,
        sickLabel: s.count > 0 ? s.datesLabel || 'beteg' : undefined,
      };
    }

    const entitlement = entitlementMap.get(empId)?.entitlementDays ?? 0;
    const usedHolidayDays = holidayDates.length;
    const remainingDays = entitlement - usedHolidayDays;

    return {
      employeeId: empId,
      employeeName: emp.name,
      companyId: emp.companyId.toString(),
      companyName: companyMap.get(emp.companyId.toString()) ?? '—',
      workerCategory: emp.workerCategory ?? 'regular',
      entitlementDays: entitlement,
      usedHolidayDays,
      remainingDays,
      months,
      personalData: emp.personalData,
    };
  });
}

// Re-export for tests / callers that used eachDayInRange via leave-summary
export { eachDayInRange };
