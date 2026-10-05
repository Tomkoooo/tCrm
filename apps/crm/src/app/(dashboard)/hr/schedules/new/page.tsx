import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { requireAnyPermission } from '@crm/auth';
import {
  ensureDefaultCompany,
  listCompanies,
  listEmployees,
  HR_SCHEDULE_WRITE_PERMISSION_KEYS,
} from '@crm/hr';
import { Button, Container } from '@crm/ui';
import { SchedulePlanCreateForm } from '../_components/schedule-plan-create-form';

export default async function NewSchedulePlanPage() {
  await requireAnyPermission([...HR_SCHEDULE_WRITE_PERMISSION_KEYS]);
  await ensureDefaultCompany();

  const [companies, employees] = await Promise.all([
    listCompanies({ activeOnly: true }),
    listEmployees({ activeOnly: true }),
  ]);

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/hr/schedules">
            <ArrowLeftIcon className="h-4 w-4" />
            Beosztások
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Új beosztás</h1>
          <p className="text-muted-foreground text-sm">
            Válaszd ki az időszakot és a dolgozókat. A rácsot a következő lépésben töltöd ki.
          </p>
        </div>
      </div>

      <SchedulePlanCreateForm
        companies={companies.map((c) => ({ id: String(c._id), name: c.name }))}
        employees={employees.map((e) => ({
          id: String(e._id),
          name: e.name,
          companyId: String(e.companyId),
          email: e.email,
          hasUser: Boolean(e.userId),
        }))}
      />
    </Container>
  );
}
