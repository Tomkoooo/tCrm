'use client';

import { DataTable } from '@crm/ui';
import { Badge } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { JOB_STATUS_LABELS } from './job-status-labels';
import type { JobStatus } from '@crm/db-core';

export type JobRow = {
  _id: string;
  reference: string;
  eventName: string;
  siteAddress: string;
  status: JobStatus;
  pickupCount: number;
  createdAt: Date;
  kitOverride?: boolean;
  hasShortage?: boolean;
};

const columns: Array<ColumnDef<JobRow>> = [
  {
    key: 'reference',
    label: 'Hivatkozás',
    type: 'string',
    sortable: true,
    filterable: true,
    searchable: true,
  },
  {
    key: 'eventName',
    label: 'Esemény',
    type: 'string',
    sortable: true,
    filterable: true,
    searchable: true,
  },
  {
    key: 'siteAddress',
    label: 'Helyszín',
    type: 'string',
    sortable: true,
    filterable: true,
    searchable: true,
  },
  {
    key: 'status',
    label: 'Állapot',
    type: 'string',
    sortable: true,
    filterable: true,
    render: (_value, row) => JOB_STATUS_LABELS[row.status] ?? row.status,
  },
  {
    key: 'pickupCount',
    label: 'Átvételek',
    type: 'number',
    sortable: false,
    filterable: false,
  },
  {
    key: 'kitOverride',
    label: 'Figyelmeztetés',
    type: 'string',
    sortable: false,
    filterable: false,
    render: (_value, row) => (
      <span className="flex flex-wrap gap-1">
        {row.kitOverride ? <Badge variant="secondary">helyi BOM</Badge> : null}
        {row.hasShortage ? <Badge variant="destructive">raktári hiány</Badge> : null}
        {!row.kitOverride && !row.hasShortage ? (
          <span className="text-muted-foreground">—</span>
        ) : null}
      </span>
    ),
  },
  { key: 'createdAt', label: 'Létrehozva', type: 'date', sortable: true },
];

export function JobsTable({
  data,
  query,
  total,
}: {
  data: JobRow[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<JobRow>
      mode="server"
      tableId="logistics-jobs"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/logistics/jobs"
      rowHref={(r) => `/logistics/jobs/${r._id}`}
    />
  );
}
