import Link from 'next/link';
import { hasPermission, requireAnyPermission } from '@crm/auth';
import {
  buildLeaveSummary,
  ensureDefaultCompany,
  listCompanies,
  MONTH_NAMES,
  HR_READ_PERMISSION_KEYS,
} from '@crm/hr';
import { Container, Card, CardContent, CardHeader, CardTitle, Button } from '@crm/ui';
import { EntitlementCell } from './_components/entitlement-cell';

export default async function LeaveSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  await ensureDefaultCompany();
  const canWrite = await hasPermission('hr:write');
  const sp = await searchParams;
  const year =
    typeof sp.year === 'string' && /^\d{4}$/.test(sp.year)
      ? Number(sp.year)
      : new Date().getFullYear();
  const companyId = typeof sp.companyId === 'string' ? sp.companyId : undefined;

  const [companies, rows] = await Promise.all([
    listCompanies({ activeOnly: true }),
    buildLeaveSummary({ year, companyId }),
  ]);

  return (
    <Container className="flex max-w-[100%] flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Szabadság összesítő</h1>
          <p className="text-muted-foreground text-sm">
            Éves keret, havi napok, felhasznált és maradék — Excel-szerű mátrix.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/hr/leave-summary?year=${year - 1}${companyId ? `&companyId=${companyId}` : ''}`}
            >
              Előző év
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/hr/leave-summary?year=${year + 1}${companyId ? `&companyId=${companyId}` : ''}`}
            >
              Következő év
            </Link>
          </Button>
          {canWrite ? (
            <Button asChild size="sm">
              <Link href="/hr/leave-summary/import">Excel import</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={`/hr/leave-summary?year=${year}`}
          className={!companyId ? 'font-medium underline' : 'text-muted-foreground'}
        >
          Összes cég
        </Link>
        {companies.map((c) => (
          <Link
            key={String(c._id)}
            href={`/hr/leave-summary?year=${year}&companyId=${c._id}`}
            className={
              companyId === String(c._id) ? 'font-medium underline' : 'text-muted-foreground'
            }
          >
            {c.name}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{year}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nincs dolgozó.</p>
          ) : (
            <table className="w-full min-w-[960px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b">
                  <th className="bg-background sticky left-0 p-2">Dolgozó</th>
                  <th className="p-2">Cég</th>
                  <th className="p-2">Éves keret</th>
                  {MONTH_NAMES.map((m) => (
                    <th key={m} className="p-2 font-medium">
                      {m.slice(0, 3)}
                    </th>
                  ))}
                  <th className="p-2">Felhasznált</th>
                  <th className="p-2">Maradék</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employeeId} className="border-b align-top">
                    <td className="bg-background sticky left-0 p-2 font-medium">
                      <Link href={`/hr/people/${r.employeeId}`} className="hover:underline">
                        {r.employeeName}
                      </Link>
                    </td>
                    <td className="text-muted-foreground p-2">{r.companyName}</td>
                    <td className="p-2">
                      {canWrite ? (
                        <EntitlementCell
                          employeeId={r.employeeId}
                          year={year}
                          value={r.entitlementDays}
                        />
                      ) : (
                        r.entitlementDays
                      )}
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const cell = r.months[m]!;
                      return (
                        <td key={m} className="p-2">
                          <div>{cell.days || '—'}</div>
                          {cell.datesLabel ? (
                            <div className="text-muted-foreground max-w-[6rem] truncate">
                              {cell.datesLabel}
                            </div>
                          ) : null}
                          {cell.sickLabel ? (
                            <div className="text-amber-700 dark:text-amber-400">
                              B: {cell.sickLabel}
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                    <td className="p-2">{r.usedHolidayDays}</td>
                    <td className="p-2 font-semibold">{r.remainingDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
