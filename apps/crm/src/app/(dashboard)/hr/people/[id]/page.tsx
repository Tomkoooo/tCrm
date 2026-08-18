import { notFound } from 'next/navigation';
import Link from 'next/link';
import { hasPermission, requireAnyPermission } from '@crm/auth';
import { connectDB, User, Company } from '@crm/db-core';
import {
  getEmployeeById,
  listScheduleEntries,
  listTimeOff,
  listSiblingMemberships,
  listCompanies,
  HR_READ_PERMISSION_KEYS,
} from '@crm/hr';
import { formatDateTime } from '@crm/lib';
import { Container, Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@crm/ui';
import { EditEmployeeForm } from '../_components/edit-employee-form';
import { AddToCompanyForm } from '../_components/add-to-company-form';

export default async function HrPersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const canWrite = await hasPermission('hr:write');
  await connectDB();

  const now = new Date();
  const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const [jobs, leave, linkedUser, company, siblings, companies] = await Promise.all([
    listScheduleEntries({
      start: now,
      end: horizon,
      employeeId: employee._id,
      kind: 'job',
    }),
    listTimeOff({ employeeId: employee._id }),
    employee.userId
      ? User.findById(employee.userId).select({ name: 1, email: 1 }).lean().exec()
      : Promise.resolve(null),
    Company.findById(employee.companyId).select({ name: 1 }).lean().exec(),
    listSiblingMemberships(employee._id),
    listCompanies({ activeOnly: true }),
  ]);

  const linkedUserLabel = linkedUser
    ? `${linkedUser.name || linkedUser.email}${linkedUser.email ? ` · ${linkedUser.email}` : ''}`
    : undefined;

  const companyOptions = companies.map((c) => ({ id: String(c._id), name: c.name }));
  const siblingCompanyIds = new Set([
    String(employee.companyId),
    ...siblings.map((s) => String(s.companyId)),
  ]);
  const otherCompanies = companyOptions.filter((c) => !siblingCompanyIds.has(c.id));

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{employee.name}</h1>
          <p className="text-muted-foreground text-sm">
            {company?.name ?? '—'} · {employee.scheduleMode === 'roster' ? 'Roster' : 'Logisztika'}
            {[employee.email, employee.phone].filter(Boolean).length
              ? ` · ${[employee.email, employee.phone].filter(Boolean).join(' · ')}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={employee.isActive ? 'default' : 'secondary'}>
            {employee.isActive ? 'Aktív' : 'Inaktív'}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/hr/people">Vissza</Link>
          </Button>
        </div>
      </div>

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil szerkesztése</CardTitle>
          </CardHeader>
          <CardContent>
            <EditEmployeeForm
              companies={companyOptions}
              employee={{
                id: String(employee._id),
                name: employee.name,
                email: employee.email,
                phone: employee.phone,
                userId: employee.userId ? String(employee.userId) : undefined,
                companyId: String(employee.companyId),
                scheduleMode: employee.scheduleMode === 'roster' ? 'roster' : 'logistics',
                calendarColor: employee.calendarColor,
                isActive: employee.isActive,
                notes: employee.notes,
              }}
              linkedUserLabel={linkedUserLabel}
            />
          </CardContent>
        </Card>
      ) : null}

      {(siblings.length > 0 || (canWrite && otherCompanies.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Más cégekben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {siblings.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nincs másik tagság.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {siblings.map((s) => (
                  <li key={String(s._id)}>
                    <Link href={`/hr/people/${s._id}`} className="hover:underline">
                      {s.name}
                    </Link>
                    <span className="text-muted-foreground"> · {String(s.companyId)}</span>
                  </li>
                ))}
              </ul>
            )}
            {canWrite && otherCompanies.length > 0 ? (
              <AddToCompanyForm
                sourceEmployeeId={String(employee._id)}
                companies={otherCompanies}
              />
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Közelgő feladatok</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nincs közelgő logisztikai feladat.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {jobs.map((j) => (
                <li key={String(j._id)} className="border-b pb-2 last:border-0">
                  <span className="font-medium">{j.title}</span>
                  <span className="text-muted-foreground block">
                    {formatDateTime(j.start, 'hu-HU')} – {formatDateTime(j.end, 'hu-HU')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Szabadság / betegszabadság</CardTitle>
        </CardHeader>
        <CardContent>
          {leave.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nincs rögzített kérelem.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {leave.slice(0, 20).map((t) => (
                <li
                  key={String(t._id)}
                  className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0"
                >
                  <Badge variant="outline">
                    {t.type === 'sick' ? 'Betegszabadság' : 'Szabadság'}
                  </Badge>
                  <Badge variant="secondary">{t.status}</Badge>
                  <span className="text-muted-foreground">
                    {formatDateTime(t.start, 'hu-HU')} – {formatDateTime(t.end, 'hu-HU')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
