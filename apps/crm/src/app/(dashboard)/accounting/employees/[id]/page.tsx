import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { requireAnyPermission, hasPermission } from '@crm/auth';
import { connectDB, Employee, Company, HrRequest } from '@crm/db';
import {
  assertCompanyInScope,
  listActiveCompanies,
  listEmployeeRecordsForSamePerson,
} from '@crm/core';
import { HR_READ_PERMISSION_KEYS } from '@crm/lib';
import { Container } from '@crm/ui';
import { Badge } from '@/components/ui/badge';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { EditPersonProfileForm } from '../_components/person-profile-form';
import { CompanyMembershipCard } from '../_components/company-membership-card';
import { LinkAccountSheetClient } from '../_components/link-account-sheet-client';
import { InviteSheetClient } from '../_components/invite-sheet-client';
import { UnlinkEmployeeButton } from '../_components/unlink-button';
import { AddToCompanySheetClient } from '../_components/add-to-company-sheet-client';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const { userId, permissions, allowedCompanyIds } = await getHrSessionScope();
  const canWrite = await hasPermission('hr:write');
  await connectDB();

  const emp = await Employee.findById(id).lean().exec();
  if (!emp) notFound();

  try {
    await assertCompanyInScope(emp.companyId as mongoose.Types.ObjectId, userId, permissions);
  } catch {
    notFound();
  }

  const [companies, relatedRecords] = await Promise.all([
    listActiveCompanies(allowedCompanyIds),
    listEmployeeRecordsForSamePerson(emp._id as mongoose.Types.ObjectId),
  ]);

  const companyNameById = new Map(companies.map((c) => [String(c._id), c.name]));
  const allCompanyIds = relatedRecords.map((r) => String(r.companyId));
  const missingNames =
    allCompanyIds.length > 0
      ? await Company.find({
          _id: {
            $in: relatedRecords
              .map((r) => r.companyId)
              .filter((cid) => !companyNameById.has(String(cid))),
          },
        })
          .select({ name: 1 })
          .lean()
          .exec()
      : [];
  for (const c of missingNames) {
    companyNameById.set(String(c._id), c.name);
  }

  const anchorId = String(relatedRecords[0]?._id ?? emp._id);
  const profileSource = relatedRecords[0] ?? emp;
  const hasLinkedAccount = relatedRecords.some((r) => r.userId);
  const occupiedCompanyIds = new Set(allCompanyIds);
  const companyOptions = companies.map((c) => ({ _id: String(c._id), name: c.name }));
  const addToCompanyOptions = companyOptions.filter((c) => !occupiedCompanyIds.has(c._id));

  const employeeIds = relatedRecords.map((r) => r._id);
  const recentRequests = await HrRequest.find({ employeeId: { $in: employeeIds } })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()
    .exec();

  const companyLabels = allCompanyIds
    .map((cid) => companyNameById.get(cid))
    .filter(Boolean) as string[];

  return (
    <Container className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{profileSource.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {companyLabels.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {relatedRecords.length > 1
            ? `${relatedRecords.length} cég — közös profil, cégenkénti bér és beosztás.`
            : 'Egy cég — másik céghez adás a lenti panelen.'}
        </p>
      </div>

      {canWrite && (
        <section className="border-border rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">CRM belépés</h3>
          {hasLinkedAccount ? (
            <div className="flex items-center gap-3">
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Fiók összekötve (minden cég rekord)
              </span>
              <UnlinkEmployeeButton employeeId={anchorId} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-sm">
                Nincs CRM fiók — összekötéskor az azonos e-mailű rekordok minden cégnél kapnak
                fiókot.
              </p>
              <div className="flex flex-wrap gap-2">
                <LinkAccountSheetClient employeeId={anchorId} email={profileSource.email} />
                {profileSource.email && (
                  <InviteSheetClient employeeId={anchorId} email={profileSource.email} />
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {canWrite && addToCompanyOptions.length > 0 && (
        <AddToCompanySheetClient sourceEmployeeId={anchorId} companies={addToCompanyOptions} />
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Közös adatok</h2>
        {canWrite ? (
          <EditPersonProfileForm
            person={{
              anchorEmployeeId: anchorId,
              name: profileSource.name,
              email: profileSource.email,
              phone: profileSource.phone,
              workerCategory: profileSource.workerCategory ?? 'regular',
              workScheduleType: profileSource.workScheduleType ?? 'full_time',
              contractedWeeklyHours: profileSource.contractedWeeklyHours,
              contractedDailyHours: profileSource.contractedDailyHours,
              calendarColor: profileSource.calendarColor,
              birthName: profileSource.personalData?.birthName,
              birthPlaceDate: profileSource.personalData?.birthPlaceDate,
              mothersName: profileSource.personalData?.mothersName,
              address: profileSource.personalData?.address,
              taj: profileSource.personalData?.taj,
              taxId: profileSource.personalData?.taxId,
              hrNotes: profileSource.hrNotes,
            }}
          />
        ) : (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd>{profileSource.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Telefon</dt>
              <dd>{profileSource.phone ?? '—'}</dd>
            </div>
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Cégek és bérezés</h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Osztály, dolgozói szám és bér cégenként — a beosztás és kimutatás ehhez a rekordhoz
          tartozik.
        </p>
        <div className="flex flex-col gap-4">
          {relatedRecords.map((record) => (
            <CompanyMembershipCard
              key={String(record._id)}
              canWrite={canWrite}
              membership={{
                employeeId: String(record._id),
                companyName: companyNameById.get(String(record.companyId)) ?? '—',
                employeeName: record.name,
                department: record.department,
                employeeNumber: record.employeeNumber,
                payType: record.payType,
                monthlySalaryHuf: record.monthlySalaryHuf,
                hourlyRateHuf: record.hourlyRateHuf,
                isActive: record.isActive,
                employmentType: record.employmentType,
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Legutóbbi kérelmek</h2>
        {recentRequests.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nincs kérelem.</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {recentRequests.map((r) => (
              <li key={String(r._id)} className="py-2">
                {companyNameById.get(
                  String(
                    relatedRecords.find((e) => String(e._id) === String(r.employeeId))?.companyId
                  )
                ) ?? '—'}{' '}
                — {r.type} — {r.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
