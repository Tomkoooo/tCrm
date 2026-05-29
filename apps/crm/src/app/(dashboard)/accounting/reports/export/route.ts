import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import { connectDB, Employee, Company, MonthlyWorkSummary } from '@crm/db';
import { exportHrMonthlyXlsx, buildCompanyFilter } from '@crm/core';
import { getHrSessionScope } from '@/lib/hr/session-scope';

export async function GET(request: Request) {
  await requirePermission('hr:reports');
  const { allowedCompanyIds } = await getHrSessionScope();
  await connectDB();

  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year') ?? new Date().getFullYear());
  const month = Number(url.searchParams.get('month') ?? new Date().getMonth() + 1);
  const companyId = url.searchParams.get('companyId');

  const filter: Record<string, unknown> = {
    year,
    month,
    ...buildCompanyFilter(allowedCompanyIds),
  };
  if (companyId) filter.companyId = companyId;

  const summaries = await MonthlyWorkSummary.find(filter).lean().exec();
  const employeeIds = summaries.map((s) => s.employeeId);
  const companyIds = summaries.map((s) => s.companyId);

  const [employees, companies] = await Promise.all([
    Employee.find({ _id: { $in: employeeIds } })
      .lean()
      .exec(),
    Company.find({ _id: { $in: companyIds } })
      .lean()
      .exec(),
  ]);

  const empById = new Map(employees.map((e) => [String(e._id), e]));
  const coById = new Map(companies.map((c) => [String(c._id), c]));

  const rows = summaries.map((s) => {
    const emp = empById.get(String(s.employeeId));
    const co = coById.get(String(s.companyId));
    return {
      companyName: co?.name ?? '',
      companySlug: co?.slug ?? '',
      employeeName: emp?.name ?? '',
      employeeNumber: emp?.employeeNumber ?? '',
      department: emp?.department ?? '',
      year: s.year,
      month: s.month,
      workedHours: s.workedHours,
      holidayDays: s.holidayDays,
      sickDays: s.sickDays,
      sickPayAmount: s.sickPayAmount ?? ('' as const),
      notes: s.notes ?? '',
    };
  });

  const buf = exportHrMonthlyXlsx(rows);

  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="hr-${year}-${month}.xlsx"`,
    },
  });
}
