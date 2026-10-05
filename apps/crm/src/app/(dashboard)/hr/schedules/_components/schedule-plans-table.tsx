'use client';

import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';

export type SchedulePlanRow = {
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

/**
 * Client wrapper so `rowHref` stays on this side of the RSC boundary — functions
 * cannot be serialised from a Server Component into a Client Component.
 */
export function SchedulePlansTable({
  data,
  query,
}: {
  data: SchedulePlanRow[];
  query: DataTableQuery;
}) {
  return (
    <DataTable<SchedulePlanRow>
      mode="client"
      tableId="hr-schedule-plans"
      data={data}
      columns={COLUMNS}
      query={query}
      total={data.length}
      basePath="/hr/schedules"
      emptyMessage="Még nincs beosztás. Hozz létre egyet, töltsd ki a rácsot, majd küldd ki."
      rowHref={(row) => `/hr/schedules/${row._id}`}
    />
  );
}
