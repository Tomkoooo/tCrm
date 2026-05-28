'use client';

import { useState } from 'react';
import { DataTable, EntitySheet } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { CreateSupplierForm } from './supplier-form';

export type SupplierRow = {
  _id: string;
  key: string;
  name: string;
  city?: string;
  country?: string;
};

export function SuppliersTable({
  data,
  columns,
  query,
  total,
  canManage,
}: {
  data: SupplierRow[];
  columns: Array<ColumnDef<SupplierRow>>;
  query: DataTableQuery;
  total: number;
  canManage: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DataTable<SupplierRow>
        mode="server"
        tableId="inventory-suppliers"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/inventory/suppliers"
        rowHref={(row) => `/inventory/suppliers/${row._id}`}
        emptyMessage="Még nincs beszállító."
        toolbarExtra={
          canManage ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új beszállító
            </Button>
          ) : undefined
        }
      />
      {canManage && (
        <EntitySheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Új beszállító"
          size="md"
          mode="create"
        >
          <CreateSupplierForm onSuccess={() => setCreateOpen(false)} />
        </EntitySheet>
      )}
    </>
  );
}
