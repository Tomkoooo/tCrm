import { requireAnyPermission, hasAnyPermission } from '@crm/auth';
import { connectDB, HrRequest, Employee, Company } from '@crm/db';
import { buildCompanyFilter } from '@crm/core';
import { HR_READ_PERMISSION_KEYS, HR_APPROVE_PERMISSION_KEYS } from '@crm/lib';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { format } from 'date-fns';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { RequestsTable, type RequestRow } from './_components/requests-table';

const TYPE_LABELS: Record<string, string> = {
  holiday: 'Szabadság',
  sick_leave: 'Betegszabadság',
  schedule_change: 'Beosztás módosítás',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Függő',
  approved: 'Jóváhagyva',
  rejected: 'Elutasítva',
  cancelled: 'Visszavonva',
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const canApprove = await hasAnyPermission([...HR_APPROVE_PERMISSION_KEYS]);
  const { allowedCompanyIds } = await getHrSessionScope();
  await connectDB();

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<RequestRow>> = [
    {
      key: 'employeeName',
      label: 'Dolgozó',
      type: 'string',
      sortable: false,
      filterable: false,
    },
    {
      key: 'companyName',
      label: 'Cég',
      type: 'string',
      sortable: false,
      filterable: false,
    },
    {
      key: 'type',
      label: 'Típus',
      type: 'string',
      sortable: true,
      filterable: true,
      mongoKey: 'type',
    },
    {
      key: 'status',
      label: 'Státusz',
      type: 'string',
      sortable: true,
      filterable: true,
      mongoKey: 'status',
    },
  ];

  const scopeFilter = buildCompanyFilter(allowedCompanyIds);
  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const mergedFilter = { ...filter, ...scopeFilter };

  const [items, total] = await Promise.all([
    HrRequest.find(mergedFilter).sort(sort).skip(skip).limit(limit).lean().exec(),
    HrRequest.countDocuments(mergedFilter).exec(),
  ]);

  const employeeIds = [...new Set(items.map((r) => String(r.employeeId)))];
  const companyIds = [...new Set(items.map((r) => String(r.companyId)))];
  const [employees, companies] = await Promise.all([
    Employee.find({ _id: { $in: employeeIds } })
      .select({ name: 1 })
      .lean()
      .exec(),
    Company.find({ _id: { $in: companyIds } })
      .select({ name: 1 })
      .lean()
      .exec(),
  ]);
  const empName = new Map(employees.map((e) => [String(e._id), e.name]));
  const coName = new Map(companies.map((c) => [String(c._id), c.name]));

  const data: RequestRow[] = items.map((r) => {
    const start = r.payload?.startDate ?? r.payload?.proposedStart;
    const end = r.payload?.endDate ?? r.payload?.proposedEnd;
    return {
      _id: String(r._id),
      employeeName: empName.get(String(r.employeeId)) ?? '—',
      companyName: coName.get(String(r.companyId)) ?? '—',
      typeKey: r.type,
      type: TYPE_LABELS[r.type] ?? r.type,
      status: STATUS_LABELS[r.status] ?? r.status,
      startLabel: start ? format(new Date(start), 'yyyy.MM.dd') : '—',
      endLabel: end ? format(new Date(end), 'yyyy.MM.dd') : '—',
      reason: r.payload?.reason,
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">HR kérelmek</h1>
        <p className="text-muted-foreground text-sm">
          Szabadság, betegség és beosztás módosítások.
        </p>
      </div>
      <RequestsTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        canApprove={canApprove}
      />
    </Container>
  );
}
