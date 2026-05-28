'use client';

import Link from 'next/link';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';

export type BuildRow = {
  sku: string;
  name: string;
  componentCount: number;
  canBuild: number;
};

const defaultQuery: DataTableQuery = { page: 1, pageSize: 25, sort: 'sku' };

export function BuildsTable({ data }: { data: BuildRow[] }) {
  const columns: Array<ColumnDef<BuildRow>> = [
    {
      key: 'sku',
      label: 'CRM SKU',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
      render: (value) => (
        <Link
          href={`/inventory/${encodeURIComponent(String(value))}`}
          className="text-primary font-mono text-xs hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </Link>
      ),
    },
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'componentCount',
      label: 'Alkatrészek',
      type: 'number',
      sortable: true,
      align: 'right',
    },
    {
      key: 'canBuild',
      label: 'Ajánlható db',
      type: 'number',
      sortable: true,
      align: 'right',
      render: (v) => <span className="font-semibold">{String(v)}</span>,
    },
  ];

  return (
    <DataTable<BuildRow>
      mode="client"
      tableId="inventory-builds"
      data={data}
      columns={columns}
      query={defaultQuery}
      total={data.length}
      basePath="/inventory/builds"
      rowHref={(r) => `/inventory/${encodeURIComponent(r.sku)}`}
      emptyMessage="Nincs BOM-mal rendelkező termék."
      variant="compact"
    />
  );
}
