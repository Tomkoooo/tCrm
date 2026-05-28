'use client';

import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';

export type MovementRow = {
  _id: string;
  reference: string;
  type: string;
  status: string;
  lineCount: number;
  createdAt: Date;
};

export function MovementsTable({
  data,
  columns,
  query,
  total,
}: {
  data: MovementRow[];
  columns: Array<ColumnDef<MovementRow>>;
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<MovementRow>
      tableId="logistics-movements"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/logistics/movements"
      rowHref={(row) => `/logistics/movements/${row._id}`}
      emptyMessage="Még nincs készletmozgás."
    />
  );
}
