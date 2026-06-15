import { notFound } from 'next/navigation';
import Link from 'next/link';
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
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { EditEmployeeForm } from '../_components/employee-form';
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

  const [company, companies, recentRequests, relatedRecords] = await Promise.all([
    Company.findById(emp.companyId).lean().exec(),
    listActiveCompanies(allowedCompanyIds),
    HrRequest.find({ employeeId: emp._id }).sort({ createdAt: -1 }).limit(10).lean().exec(),
    listEmployeeRecordsForSamePerson(emp._id as mongoose.Types.ObjectId),
  ]);

  const companyOptions = companies.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  const occupiedCompanyIds = new Set(relatedRecords.map((r) => String(r.companyId)));
  const addToCompanyOptions = companyOptions.filter((c) => !occupiedCompanyIds.has(c._id));

  const otherRecords = relatedRecords.filter((r) => String(r._id) !== String(emp._id));
  const otherCompanyIds = otherRecords.map((r) => r.companyId);
  const otherCompanies =
    otherCompanyIds.length > 0
      ? await Company.find({ _id: { $in: otherCompanyIds } })
          .select({ name: 1 })
          .lean()
          .exec()
      : [];
  const otherCompanyNameById = new Map(otherCompanies.map((c) => [String(c._id), c.name]));
  const relatedWithNames = otherRecords.map((r) => ({
    _id: String(r._id),
    companyName: otherCompanyNameById.get(String(r.companyId)) ?? '—',
  }));

  return (
    <Container className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{emp.name}</h1>
        <p className="text-muted-foreground text-sm">
          {company?.name ?? '—'} · {emp.employmentType === 'guest' ? 'Vendég' : 'Dolgozó'}
          {emp.userId ? ' · CRM fiók összekötve' : ' · Nincs CRM fiók'}
        </p>
      </div>

      {relatedWithNames.length > 0 && (
        <section className="border-border rounded-lg border p-4">
          <h2 className="mb-2 text-sm font-medium">Más cégek (külön rekord)</h2>
          <ul className="text-sm">
            {relatedWithNames.map((r) => (
              <li key={r._id}>
                <Link
                  href={`/accounting/employees/${r._id}`}
                  className="text-primary hover:underline"
                >
                  {r.companyName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          <AddToCompanySheetClient
            sourceEmployeeId={String(emp._id)}
            companies={addToCompanyOptions}
          />
          {!emp.userId && (
            <>
              <LinkAccountSheetClient employeeId={String(emp._id)} email={emp.email} />
              {emp.email && <InviteSheetClient employeeId={String(emp._id)} email={emp.email} />}
            </>
          )}
          {emp.userId && <UnlinkEmployeeButton employeeId={String(emp._id)} />}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Adatok</h2>
        {canWrite ? (
          <EditEmployeeForm
            employee={{
              _id: String(emp._id),
              companyId: String(emp.companyId),
              name: emp.name,
              email: emp.email,
              employeeNumber: emp.employeeNumber,
              department: emp.department,
              phone: emp.phone,
              employmentType: emp.employmentType,
              workerCategory: emp.workerCategory ?? 'regular',
              workScheduleType: emp.workScheduleType ?? 'full_time',
              contractedWeeklyHours: emp.contractedWeeklyHours,
              contractedDailyHours: emp.contractedDailyHours,
              payType: emp.payType,
              monthlySalaryHuf: emp.monthlySalaryHuf,
              hourlyRateHuf: emp.hourlyRateHuf,
              birthName: emp.personalData?.birthName,
              birthPlaceDate: emp.personalData?.birthPlaceDate,
              mothersName: emp.personalData?.mothersName,
              address: emp.personalData?.address,
              taj: emp.personalData?.taj,
              taxId: emp.personalData?.taxId,
              isActive: emp.isActive,
              hrNotes: emp.hrNotes,
            }}
            companies={companyOptions}
          />
        ) : (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd>{emp.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Osztály</dt>
              <dd>{emp.department ?? '—'}</dd>
            </div>
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Legutóbbi kérelmek</h2>
        {recentRequests.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nincs kérelem.</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {recentRequests.map((r) => (
              <li key={String(r._id)} className="py-2">
                {r.type} — {r.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
