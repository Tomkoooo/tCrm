import Link from 'next/link';
import { getCurrentUser, hasPermission } from '@crm/auth';
import { getRemainingLeaveDays, listCompanies, listMembershipsForUser, listTimeOff } from '@crm/hr';
import { connectDB, LogisticsJob, type CrewRole } from '@crm/db-core';
import { formatDateTime } from '@crm/lib';
import { Container, Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@crm/ui';
import { CREW_ROLE_LABELS } from '@/lib/crew-labels';
import { MeLeaveClient } from './_components/me-leave-client';
import { MeCompanyTabs } from './_components/me-membership-switcher';
import { HrCalendar } from '../_components/hr-calendar';
import { CancelTimeOffButton } from './_components/cancel-time-off-button';

export default async function HrMePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const canReadHr = await hasPermission('hr:read');
  const sp = await searchParams;
  const companyParam = typeof sp.company === 'string' ? sp.company : undefined;

  const [memberships, companies] = await Promise.all([
    listMembershipsForUser(user.id),
    listCompanies({ activeOnly: true }),
  ]);
  const companyMap = new Map(companies.map((c) => [String(c._id), c.name]));

  if (!memberships.length) {
    return (
      <Container className="flex max-w-3xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Saját feladataim</h1>
          <p className="text-muted-foreground text-sm">
            Még nincs dolgozó profil a fiókodhoz. Kérj meg egy HR szerkesztőt, hogy összekösse.
          </p>
        </div>
      </Container>
    );
  }

  const selected =
    companyParam && memberships.some((m) => String(m.companyId) === companyParam)
      ? memberships.filter((m) => String(m.companyId) === companyParam)
      : memberships;
  const single = selected.length === 1 ? selected[0] : undefined;
  const selectedIds = selected.map((m) => m._id);
  const year = new Date().getFullYear();

  const [leave, remainingRows, jobs] = await Promise.all([
    listTimeOff({ employeeIds: selectedIds }),
    Promise.all(
      selected.map(async (m) => ({
        employeeId: String(m._id),
        companyId: String(m.companyId),
        companyName: companyMap.get(String(m.companyId)) ?? 'Cég',
        remaining: await getRemainingLeaveDays(m._id, year),
      }))
    ),
    (async () => {
      await connectDB();
      return LogisticsJob.find({
        'crew.employeeId': { $in: selectedIds },
        status: { $nin: ['cancelled', 'completed'] },
      })
        .sort({ plannedEventAt: 1, plannedGatherAt: 1 })
        .limit(40)
        .lean()
        .exec();
    })(),
  ]);

  const membershipById = new Map(selected.map((m) => [String(m._id), m]));

  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Saját feladataim</h1>
          <p className="text-muted-foreground text-sm">
            {single
              ? `${single.name}${
                  companyMap.get(String(single.companyId))
                    ? ` · ${companyMap.get(String(single.companyId))}`
                    : ''
                }`
              : `${user.name || user.email} · ${memberships.length} céges tagság`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {single ? <MeLeaveClient employeeId={String(single._id)} /> : null}
          {canReadHr ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/hr/leave-summary">Összesítő</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {memberships.length > 1 ? (
        <MeCompanyTabs
          companies={[
            ...new Map(
              memberships.map((m) => [
                String(m.companyId),
                companyMap.get(String(m.companyId)) ?? 'Cég',
              ])
            ),
          ].map(([id, name]) => ({ id, name }))}
          activeCompanyId={
            companyParam && memberships.some((m) => String(m.companyId) === companyParam)
              ? companyParam
              : undefined
          }
        />
      ) : null}

      {!single && memberships.length > 1 ? (
        <p className="text-muted-foreground text-sm">Szabadság kéréséhez válassz egy céget fent.</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{year} szabadságkeret</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {remainingRows.map((row) => (
            <p key={row.employeeId}>
              {remainingRows.length > 1 ? (
                <span className="font-medium">{row.companyName} · </span>
              ) : null}
              keret {row.remaining.entitlementDays} · felhasznált {row.remaining.usedHolidayDays} ·{' '}
              <strong>maradék {row.remaining.remainingDays}</strong>
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Következő feladatok</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nincs aktív szállítás a kiválasztott cég(ek)ben.
            </p>
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => {
                const crewHits = (job.crew ?? []).filter((c) =>
                  membershipById.has(String(c.employeeId))
                );
                const roles = [...new Set(crewHits.flatMap((c) => c.roles))] as CrewRole[];
                const companyNames = [
                  ...new Set(
                    crewHits.map(
                      (c) =>
                        companyMap.get(
                          String(membershipById.get(String(c.employeeId))?.companyId)
                        ) ?? 'Cég'
                    )
                  ),
                ];
                const when = job.plannedEventAt ?? job.plannedGatherAt;
                return (
                  <li
                    key={String(job._id)}
                    className="flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{job.eventName}</p>
                      <p className="text-muted-foreground text-xs">
                        {job.reference}
                        {when ? ` · ${formatDateTime(when, 'hu-HU')}` : ''}
                        {job.siteAddress ? ` · ${job.siteAddress}` : ''}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {companyNames.length > 1 || memberships.length > 1
                          ? companyNames.map((name) => (
                              <Badge key={name} variant="outline">
                                {name}
                              </Badge>
                            ))
                          : null}
                        {roles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {CREW_ROLE_LABELS[role]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/logistics/jobs/${String(job._id)}`}>Checklist megnyitása</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Naptáram</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-2 text-xs">
            Szállítási feladatra kattintva a checklist nyílik meg.
          </p>
          <HrCalendar mode="self" employeeId={single ? String(single._id) : undefined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kérelmeim</CardTitle>
        </CardHeader>
        <CardContent>
          {leave.length === 0 ? (
            <p className="text-muted-foreground text-sm">Még nincs kérelem.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {leave.slice(0, 30).map((t) => {
                const companyName = companyMap.get(String(t.companyId));
                return (
                  <li
                    key={String(t._id)}
                    className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0"
                  >
                    {memberships.length > 1 && companyName ? (
                      <Badge variant="outline">{companyName}</Badge>
                    ) : null}
                    <Badge variant="outline">
                      {t.type === 'sick' ? 'Betegszabadság' : 'Szabadság'}
                    </Badge>
                    <Badge variant="secondary">{t.status}</Badge>
                    <span className="text-muted-foreground">
                      {formatDateTime(t.start, 'hu-HU')} – {formatDateTime(t.end, 'hu-HU')}
                    </span>
                    {t.status === 'pending' ? <CancelTimeOffButton id={String(t._id)} /> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
