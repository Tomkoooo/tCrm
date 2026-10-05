import Link from 'next/link';
import { CalendarPlusIcon } from 'lucide-react';
import { hasAnyPermission, requireAnyPermission } from '@crm/auth';
import {
  ensureDefaultCompany,
  formatPeriodLabel,
  listCompanies,
  listSchedulePlans,
  HR_SCHEDULE_READ_PERMISSION_KEYS,
  HR_SCHEDULE_WRITE_PERMISSION_KEYS,
} from '@crm/hr';
import { Button, Container, DataTable, parseDataTableQuery, type ColumnDef } from '@crm/ui';

type SchedulePlanRow = {
  _id: string;
  title: string;
  company: string;
  period: string;
  status: string;
  employees: number;
  publishedAt: string;
};

const COLUMNS: Array<ColumnDef<SchedulePlanRow>> = [
  { key: 'title', label: 'Megnevezés', type: 'string', sortable: true, searchable: true },
  { key: 'company', label: 'Cég', type: 'string', sortable: true, filterable: true },
  { key: 'period', label: 'Időszak', type: 'string' },
  {
    key: 'status',
    label: 'Állapot',
    type: 'enum',
    filterable: true,
    enumValues: [
      { value: 'Piszkozat', label: 'Piszkozat' },
      { value: 'Kiküldve', label: 'Kiküldve' },
    ],
  },
  { key: 'employees', label: 'Dolgozók', type: 'number', align: 'right' },
  { key: 'publishedAt', label: 'Kiküldve', type: 'string' },
];

export default async function HrSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_SCHEDULE_READ_PERMISSION_KEYS]);
  await ensureDefaultCompany();

  const canWrite = await hasAnyPermission([...HR_SCHEDULE_WRITE_PERMISSION_KEYS]);
  const sp = await searchParams;
  const query = parseDataTableQuery(sp);

  const [plans, companies] = await Promise.all([
    listSchedulePlans(),
    listCompanies({ activeOnly: false }),
  ]);
  const companyNames = new Map(companies.map((c) => [String(c._id), c.name]));

  const rows: SchedulePlanRow[] = plans.map((plan) => ({
    _id: String(plan._id),
    title: plan.title,
    company: companyNames.get(String(plan.companyId)) ?? '—',
    period: formatPeriodLabel(plan),
    status: plan.status === 'published' ? 'Kiküldve' : 'Piszkozat',
    employees: plan.employeeIds.length,
    publishedAt: plan.publishedAt
      ? plan.publishedAt.toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' })
      : '—',
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Beosztások</h1>
          <p className="text-muted-foreground text-sm">
            Beosztás összeállítása, kiküldése e-mailben és naptár-feliratkozás — az Excel helyett.
          </p>
        </div>
        {canWrite ? (
          <Button asChild size="sm">
            <Link href="/hr/schedules/new">
              <CalendarPlusIcon className="h-4 w-4" />
              Új beosztás
            </Link>
          </Button>
        ) : null}
      </div>

      <DataTable<SchedulePlanRow>
        mode="client"
        tableId="hr-schedule-plans"
        data={rows}
        columns={COLUMNS}
        query={query}
        total={rows.length}
        basePath="/hr/schedules"
        emptyMessage="Még nincs beosztás. Hozz létre egyet, töltsd ki a rácsot, majd küldd ki."
        rowHref={(row) => `/hr/schedules/${row._id}`}
      />
    </Container>
  );
}
