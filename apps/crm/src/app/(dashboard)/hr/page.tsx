import Link from 'next/link';
import { hasAnyPermission, requireAnyPermission } from '@crm/auth';
import {
  getHrDashboardSummary,
  ensureDefaultCompany,
  HR_NAV_PERMISSION_KEYS,
  HR_READ_PERMISSION_KEYS,
} from '@crm/hr';
import { Container, Card, CardContent, CardHeader, CardTitle, Button } from '@crm/ui';

export default async function HrOverviewPage() {
  await requireAnyPermission([...HR_NAV_PERMISSION_KEYS]);
  await ensureDefaultCompany();
  const canRead = await hasAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const summary = canRead
    ? await getHrDashboardSummary()
    : { peopleCount: 0, pendingLeaveCount: 0, jobsThisWeekCount: 0 };

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">HR</h1>
        <p className="text-muted-foreground text-sm">
          Dolgozók, szabadság, és a logisztikai feladatokból következő naptár / órák.
        </p>
      </div>

      {canRead ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktív dolgozók</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.peopleCount}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Függő kérelmek</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {summary.pendingLeaveCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feladatok (7 nap)</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {summary.jobsThisWeekCount}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/hr/me">Saját feladataim</Link>
        </Button>
        {canRead ? (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/hr/people">Dolgozók</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/hr/calendar">Naptár</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/hr/leave">Szabadság</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/hr/leave-summary">Összesítő</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/hr/hours">Órák</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/hr/companies">Cégek</Link>
            </Button>
          </>
        ) : null}
      </div>
    </Container>
  );
}
