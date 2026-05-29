import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { connectDB, Employee } from '@crm/db';
import { listActiveCompanies, listMonthlySummaries, buildCompanyFilter } from '@crm/core';
import { Container } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { ReportsClient, type ReportRow } from './_components/reports-client';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('hr:reports');
  const { allowedCompanyIds } = await getHrSessionScope();
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year ?? now.getFullYear());
  const month = Number(sp.month ?? now.getMonth() + 1);
  const companyId = typeof sp.companyId === 'string' ? sp.companyId : '';

  await connectDB();

  const companies = await listActiveCompanies(allowedCompanyIds);
  const empFilter = buildCompanyFilter(allowedCompanyIds);
  if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
    empFilter.companyId = new mongoose.Types.ObjectId(companyId);
  }

  const [employees, summaries] = await Promise.all([
    Employee.find({ ...empFilter, isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec(),
    listMonthlySummaries({
      year,
      month,
      companyId:
        companyId && mongoose.Types.ObjectId.isValid(companyId)
          ? new mongoose.Types.ObjectId(companyId)
          : undefined,
      allowedCompanyIds,
    }),
  ]);

  const summaryByEmp = new Map(summaries.map((s) => [String(s.employeeId), s]));
  const companyNameById = new Map(companies.map((c) => [String(c._id), c.name]));

  const rows: ReportRow[] = employees.map((e) => {
    const s = summaryByEmp.get(String(e._id));
    return {
      employeeId: String(e._id),
      employeeName: e.name,
      companyName: companyNameById.get(String(e.companyId)) ?? '—',
      workedHours: s?.workedHours ?? 0,
      holidayDays: s?.holidayDays ?? 0,
      sickDays: s?.sickDays ?? 0,
      sickPayAmount: s?.sickPayAmount,
      notes: s?.notes,
      summaryId: s ? String(s._id) : undefined,
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Havi kimutatások</h1>
        <p className="text-muted-foreground text-sm">
          Ledolgozott órák, szabadság, betegnapok és táppénz — export könyveléshez.
        </p>
      </div>
      <ReportsClient
        year={year}
        month={month}
        companyId={companyId}
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
        rows={rows}
      />
    </Container>
  );
}
