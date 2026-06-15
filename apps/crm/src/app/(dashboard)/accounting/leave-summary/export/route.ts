import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import { buildLeaveSummary, exportLeaveSummaryXlsx, exportOccasionalWorkersXlsx } from '@crm/core';
import { getHrSessionScope } from '@/lib/hr/session-scope';

export async function GET(request: Request) {
  await requirePermission('hr:reports');
  const { allowedCompanyIds } = await getHrSessionScope();

  const url = new URL(request.url);
  const year = Number(url.searchParams.get('year') ?? new Date().getFullYear());
  const monthParam = url.searchParams.get('month');
  const month = monthParam ? Number(monthParam) : undefined;
  const companyId = url.searchParams.get('companyId') ?? '';
  const tab = url.searchParams.get('tab') === 'occasional' ? 'occasional' : 'regular';

  const rows = await buildLeaveSummary({
    year,
    companyId:
      companyId && mongoose.Types.ObjectId.isValid(companyId)
        ? new mongoose.Types.ObjectId(companyId)
        : undefined,
    workerCategory: tab,
    allowedCompanyIds,
  });

  const buffer =
    tab === 'occasional' && month == null
      ? exportOccasionalWorkersXlsx(rows, year)
      : exportLeaveSummaryXlsx(rows, { year, month });

  const filename =
    month != null
      ? `szabadsag-${year}-${String(month).padStart(2, '0')}.xlsx`
      : `szabadsag-${year}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
