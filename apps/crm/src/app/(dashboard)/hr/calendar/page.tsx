import { Suspense } from 'react';
import { hasPermission, requireAnyPermission } from '@crm/auth';
import {
  ensureDefaultCompany,
  listCompanies,
  listEmployees,
  HR_READ_PERMISSION_KEYS,
} from '@crm/hr';
import { Container } from '@crm/ui';
import { CalendarPageClient } from './_components/calendar-page-client';

export default async function HrCalendarPage() {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  await ensureDefaultCompany();
  const canWrite = await hasPermission('hr:write');
  const [companies, employees] = await Promise.all([
    listCompanies({ activeOnly: true }),
    listEmployees({ activeOnly: true }),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Naptár</h1>
        <p className="text-muted-foreground text-sm">
          Logisztikai feladatok + távollét; roster dolgozóknál kézzel szerkeszthető műszakok.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Betöltés…</p>}>
        <CalendarPageClient
          canWrite={canWrite}
          companies={companies.map((c) => ({ id: String(c._id), name: c.name }))}
          employees={employees.map((e) => ({
            id: String(e._id),
            name: e.name,
            scheduleMode: e.scheduleMode === 'roster' ? 'roster' : 'logistics',
            companyId: String(e.companyId),
          }))}
        />
      </Suspense>
    </Container>
  );
}
