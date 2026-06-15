import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import { connectDB, Employee, Company } from '@crm/db';
import { exportHrMonthlyXlsx, buildMonthlyKimutatasRows } from '@crm/core';
import { payTypeLabel } from '@crm/lib';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  await requirePermission('hr:reports');
  const { allowedCompanyIds } = await getHrSessionScope();
  await connectDB();

  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year') ?? new Date().getFullYear());
  const month = Number(url.searchParams.get('month') ?? new Date().getMonth() + 1);
  const companyId = url.searchParams.get('companyId');
  const companyOid =
    companyId && mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : undefined;

  const kimutatasRows = await buildMonthlyKimutatasRows({
    year,
    month,
    companyId: companyOid,
    allowedCompanyIds,
  });

  const employeeIds = kimutatasRows.map((r) => r.employeeId);
  const companyIds = [...new Set(kimutatasRows.map((r) => r.companyId))];

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

  const rows = kimutatasRows.map((r) => {
    const emp = empById.get(r.employeeId);
    const co = coById.get(r.companyId);
    return {
      companyName: co?.name ?? r.companyName,
      companySlug: co?.slug ?? '',
      employeeName: r.employeeName,
      employeeNumber: emp?.employeeNumber ?? '',
      department: emp?.department ?? '',
      year,
      month,
      entitlementDays: r.entitlementDays,
      remainingDays: r.remainingDays,
      payTypeLabel: payTypeLabel(r.payType),
      workedHours: r.workedHours,
      holidayDays: r.holidayDays,
      sickDays: r.sickDays,
      sickPayAmount: r.sickPayAmount ?? ('' as const),
      grossPayHuf: r.grossPayHuf ?? ('' as const),
      notes: r.notes ?? '',
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
