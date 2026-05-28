'use client';

import type React from 'react';
import Link from 'next/link';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';

type MovementRow = {
  _id: string;
  reference: string;
  type: string;
  status: string;
};

type ReservationRow = {
  _id: string;
  reference: string;
  status: string;
  lineCount: number;
};

const defaultQuery: DataTableQuery = { page: 1, pageSize: 5 };

export function RecentMovementsTable({ data }: { data: MovementRow[] }) {
  const columns: Array<ColumnDef<MovementRow>> = [
    { key: 'reference', label: 'Hivatkozás', type: 'string', sortable: false, searchable: true },
    { key: 'type', label: 'Típus', type: 'string', sortable: false },
    { key: 'status', label: 'Státusz', type: 'string', sortable: false },
  ];

  return (
    <DataTable<MovementRow>
      mode="client"
      tableId="logistics-recent-movements"
      data={data}
      columns={columns}
      query={defaultQuery}
      total={data.length}
      basePath="/logistics"
      rowHref={(r) => `/logistics/movements/${r._id}`}
      emptyMessage="Nincs mozgás."
      variant="compact"
    />
  );
}

export function ActiveReservationsTable({ data }: { data: ReservationRow[] }) {
  const columns: Array<ColumnDef<ReservationRow>> = [
    { key: 'reference', label: 'Hivatkozás', type: 'string', sortable: false, searchable: true },
    { key: 'status', label: 'Státusz', type: 'string', sortable: false },
    { key: 'lineCount', label: 'Sorok', type: 'number', sortable: false, align: 'right' },
  ];

  return (
    <DataTable<ReservationRow>
      mode="client"
      tableId="logistics-active-reservations"
      data={data}
      columns={columns}
      query={defaultQuery}
      total={data.length}
      basePath="/logistics/reservations"
      rowHref={(r) => `/logistics/reservations?highlight=${r._id}`}
      emptyMessage="Nincs aktív foglalás."
      variant="compact"
    />
  );
}

export function SnippetTableLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-primary text-sm hover:underline">
      {children}
    </Link>
  );
}
