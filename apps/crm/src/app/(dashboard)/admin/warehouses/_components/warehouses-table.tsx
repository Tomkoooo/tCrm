'use client';

import { useState } from 'react';
import { DataTable, EntitySheet } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { CreateWarehouseForm } from './warehouse-form';

export type WarehouseRow = {
  _id: string;
  key: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
};

export function WarehousesTable({
  data,
  columns,
  query,
  total,
  canManage,
}: {
  data: WarehouseRow[];
  columns: Array<ColumnDef<WarehouseRow>>;
  query: DataTableQuery;
  total: number;
  canManage: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DataTable<WarehouseRow>
        mode="server"
        tableId="admin-warehouses"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/admin/warehouses"
        rowHref={(r) => `/admin/warehouses/${r._id}`}
        toolbarExtra={
          canManage ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új raktár
            </Button>
          ) : undefined
        }
      />
      {canManage && (
        <EntitySheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Új raktár"
          size="md"
          mode="create"
        >
          <CreateWarehouseForm onSuccess={() => setCreateOpen(false)} />
        </EntitySheet>
      )}
    </>
  );
}
