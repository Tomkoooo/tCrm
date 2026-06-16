import { requireAnyPermission, hasAnyPermission } from '@crm/auth';
import { connectDB, HrRequest, Employee, Company } from '@crm/db';
import { buildCompanyFilter } from '@crm/core';
import {
  HR_READ_PERMISSION_KEYS,
  HR_APPROVE_PERMISSION_KEYS,
  formatScheduleChangeSummary,
  formatScheduleRange,
} from '@crm/lib';
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

function formatPeriod(
  typeKey: string,
  start: Date | undefined,
  end: Date | undefined,
  originalStart?: Date,
  originalEnd?: Date
): string {
  if (typeKey === 'schedule_change') {
    return formatScheduleChangeSummary(originalStart, originalEnd, start, end);
  }
  if (!start && !end) return '—';
  const startStr = start ? format(start, 'yyyy.MM.dd') : '—';
  const endStr = end ? format(end, 'yyyy.MM.dd') : '—';
  return `${startStr} – ${endStr}`;
}

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
      key: 'periodLabel',
      label: 'Időszak / módosítás',
      type: 'string',
      sortable: false,
      filterable: false,
    },
    {
      key: 'status',
      label: 'Státusz',
      type: 'enum',
      sortable: true,
      filterable: true,
      mongoKey: 'status',
      enumValues: [
        { value: 'pending', label: 'Függő' },
        { value: 'approved', label: 'Jóváhagyva' },
        { value: 'rejected', label: 'Elutasítva' },
        { value: 'cancelled', label: 'Visszavonva' },
      ],
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
    const startRaw = r.payload?.startDate ?? r.payload?.proposedStart;
    const endRaw = r.payload?.endDate ?? r.payload?.proposedEnd;
    const originalStartRaw = r.payload?.originalStart;
    const originalEndRaw = r.payload?.originalEnd;
    const start = startRaw ? new Date(startRaw) : undefined;
    const end = endRaw ? new Date(endRaw) : undefined;
    const originalStart = originalStartRaw ? new Date(originalStartRaw) : undefined;
    const originalEnd = originalEndRaw ? new Date(originalEndRaw) : undefined;

    return {
      _id: String(r._id),
      employeeName: empName.get(String(r.employeeId)) ?? '—',
      companyName: coName.get(String(r.companyId)) ?? '—',
      typeKey: r.type,
      type: TYPE_LABELS[r.type] ?? r.type,
      statusKey: r.status,
      status: STATUS_LABELS[r.status] ?? r.status,
      periodLabel: formatPeriod(r.type, start, end, originalStart, originalEnd),
      originalScheduleLabel:
        originalStart && originalEnd ? formatScheduleRange(originalStart, originalEnd) : undefined,
      proposedScheduleLabel: start && end ? formatScheduleRange(start, end) : undefined,
      originalTitle: r.payload?.originalTitle,
      startLabel: start ? format(start, 'yyyy.MM.dd') : '—',
      endLabel: end ? format(end, 'yyyy.MM.dd') : '—',
      reason: r.payload?.reason,
      sickPayAmount: r.payload?.sickPayAmount,
      submittedAtLabel: format(new Date(r.createdAt), 'yyyy.MM.dd HH:mm'),
      reviewNote: r.reviewNote,
      reviewedAtLabel: r.reviewedAt
        ? format(new Date(r.reviewedAt), 'yyyy.MM.dd HH:mm')
        : undefined,
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">HR kérelmek</h1>
        <p className="text-muted-foreground text-sm">
          Szabadság, betegség és beosztás módosítások. Kattintson egy sorra a részletekért és
          elbíráláshoz.
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
