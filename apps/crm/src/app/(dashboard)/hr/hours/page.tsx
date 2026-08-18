import Link from 'next/link';
import { requireAnyPermission } from '@crm/auth';
import { getMonthlyHours, HR_READ_PERMISSION_KEYS } from '@crm/hr';
import { Container, Card, CardContent, CardHeader, CardTitle, Button } from '@crm/ui';

function parseYearMonth(sp: Record<string, string | string[] | undefined>): {
  year: number;
  month: number;
} {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  if (typeof sp.year === 'string' && /^\d{4}$/.test(sp.year)) year = Number(sp.year);
  if (typeof sp.month === 'string' && /^(0?[1-9]|1[0-2])$/.test(sp.month)) {
    month = Number(sp.month);
  }
  return { year, month };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default async function HrHoursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const sp = await searchParams;
  const { year, month } = parseYearMonth(sp);
  const rows = await getMonthlyHours({ year, month });
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const label = new Date(year, month - 1, 1).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Órák</h1>
          <p className="text-muted-foreground text-sm">
            Havi órák = a logisztikai feladatok naptárablakai (nincs külön timesheet).
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/hr/hours?year=${prev.year}&month=${prev.month}`}>Előző</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/hr/hours">Aktuális</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/hr/hours?year=${next.year}&month=${next.month}`}>Következő</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Ebben a hónapban nincs feladat-óra.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-medium">Dolgozó</th>
                    <th className="py-2 pr-4 font-medium">Feladatok</th>
                    <th className="py-2 font-medium">Órák</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.employeeId} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Link
                          href={`/hr/people/${r.employeeId}`}
                          className="font-medium hover:underline"
                        >
                          {r.name}
                        </Link>
                        {r.email ? (
                          <span className="text-muted-foreground block text-xs">{r.email}</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4">{r.jobCount}</td>
                      <td className="py-2 font-mono">{r.hours.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
