import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { requireAnyPermission, hasPermission } from '@crm/auth';
import { connectDB, Employee, Company, HrRequest } from '@crm/db';
import { assertCompanyInScope, listActiveCompanies } from '@crm/core';
import { HR_READ_PERMISSION_KEYS } from '@crm/lib';
import { Container } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { EditEmployeeForm } from '../_components/employee-form';
import { InviteSheetClient } from '../_components/invite-sheet-client';
import { UnlinkEmployeeButton } from '../_components/unlink-button';

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

  const [company, companies, recentRequests] = await Promise.all([
    Company.findById(emp.companyId).lean().exec(),
    listActiveCompanies(allowedCompanyIds),
    HrRequest.find({ employeeId: emp._id }).sort({ createdAt: -1 }).limit(10).lean().exec(),
  ]);

  const companyOptions = companies.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  return (
    <Container className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{emp.name}</h1>
        <p className="text-muted-foreground text-sm">
          {company?.name ?? '—'} · {emp.employmentType === 'guest' ? 'Vendég' : 'Dolgozó'}
          {emp.userId ? ' · Van fiók' : ''}
        </p>
      </div>

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          {!emp.userId && emp.email && (
            <InviteSheetClient employeeId={String(emp._id)} email={emp.email} />
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
