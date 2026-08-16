'use client';

import { ProductSkuLabel } from '@/components/product-sku-label';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { ReservationStatusBadge } from '../../_components/reservation-status-badge';

export type ReservationLineRow = {
  id: string;
  sourceRef: string;
  warehouseName: string;
  sku: string;
  name: string;
  quantity: number;
  status: string;
};

const defaultQuery: DataTableQuery = { page: 1, pageSize: 25, sort: 'sourceRef' };

export function ReservationsLinesTable({ data }: { data: ReservationLineRow[] }) {
  const columns: Array<ColumnDef<ReservationLineRow>> = [
    {
      key: 'sourceRef',
      label: 'Hivatkozás',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'warehouseName', label: 'Raktár', type: 'string', sortable: true, filterable: true },
    {
      key: 'sku',
      label: 'Termék',
      type: 'string',
      sortable: true,
      searchable: true,
      render: (_v, row) => <ProductSkuLabel sku={row.sku} name={row.name} layout="stack" />,
    },
    { key: 'quantity', label: 'Menny.', type: 'number', sortable: true, align: 'right' },
    {
      key: 'status',
      label: 'Státusz',
      type: 'string',
      sortable: true,
      render: (_, row) => (
        <ReservationStatusBadge status={row.status as 'active' | 'fulfilled' | 'cancelled'} />
      ),
    },
  ];

  return (
    <DataTable<ReservationLineRow>
      mode="client"
      tableId="logistics-reservations-lines"
      data={data}
      columns={columns}
      query={defaultQuery}
      total={data.length}
      basePath="/logistics/reservations"
      emptyMessage="Nincs aktív foglalás."
    />
  );
}
