'use client';

import Link from 'next/link';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';

export type BuildRow = {
  sku: string;
  name: string;
  componentCount: number;
  canBuild: number;
};

const defaultQuery: DataTableQuery = { page: 1, pageSize: 25, sort: 'sku' };

export function BuildsTable({ data, canWrite = false }: { data: BuildRow[]; canWrite?: boolean }) {
  const columns: Array<ColumnDef<BuildRow>> = [
    {
      key: 'sku',
      label: 'Termék',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
      render: (_value, row) => (
        <ProductSkuLabel
          sku={row.sku}
          name={row.name}
          layout="stack"
          href={`/inventory/${encodeURIComponent(row.sku)}`}
        />
      ),
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
    ...(canWrite
      ? [
          {
            key: 'actions',
            label: '',
            type: 'string' as const,
            sortable: false,
            align: 'right' as const,
            render: (_v, row) => (
              <Link
                href={`/inventory/${encodeURIComponent(row.sku)}?edit=1`}
                className="text-primary text-xs hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Szerkesztés
              </Link>
            ),
          } satisfies ColumnDef<BuildRow>,
        ]
      : []),
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
