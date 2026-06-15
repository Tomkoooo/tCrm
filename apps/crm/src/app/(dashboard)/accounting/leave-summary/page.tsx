import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { buildLeaveSummary, buildMonthlyKimutatasRows, listActiveCompanies } from '@crm/core';
import { Container } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { KimutatasokClient } from './_components/kimutatasok-client';

export default async function LeaveSummaryPage({
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
  const tab = sp.tab === 'occasional' ? 'occasional' : 'regular';
  const view = sp.view === 'hours' ? 'hours' : 'leave';

  const companyOid =
    companyId && mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : undefined;

  const companies = await listActiveCompanies(allowedCompanyIds);

  const leaveRows =
    view === 'leave'
      ? await buildLeaveSummary({
          year,
          companyId: companyOid,
          workerCategory: tab,
          allowedCompanyIds,
        })
      : [];

  const hoursRows =
    view === 'hours'
      ? await buildMonthlyKimutatasRows({
          year,
          month,
          companyId: companyOid,
          allowedCompanyIds,
        })
      : [];

  return (
    <Container className="flex max-w-[1400px] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Kimutatások</h1>
        <p className="text-muted-foreground text-sm">
          Szabadság összesítő és havi bér/óra kimutatás — beosztás és kérelmek alapján, exporttal.
        </p>
      </div>
      <KimutatasokClient
        view={view}
        year={year}
        month={month}
        companyId={companyId}
        tab={tab}
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
        leaveRows={leaveRows}
        hoursRows={hoursRows}
      />
    </Container>
  );
}
