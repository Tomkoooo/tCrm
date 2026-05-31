'use client';

import { useState } from 'react';
import { DataTable, EntitySheet } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { CreateVehicleForm } from './vehicle-form';

export type VehicleRow = {
  _id: string;
  name: string;
  plateNumber: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  isActive: boolean;
};

export function VehiclesTable({
  data,
  columns,
  query,
  total,
  canWrite,
}: {
  data: VehicleRow[];
  columns: Array<ColumnDef<VehicleRow>>;
  query: DataTableQuery;
  total: number;
  canWrite: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DataTable<VehicleRow>
        mode="server"
        tableId="logistics-vehicles"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/logistics/vehicles"
        rowHref={(row) => `/logistics/vehicles/${row._id}`}
        toolbarExtra={
          canWrite ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új jármű
            </Button>
          ) : undefined
        }
      />
      {canWrite && (
        <EntitySheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Új jármű"
          size="md"
          mode="create"
        >
          <CreateVehicleForm onSuccess={() => setCreateOpen(false)} />
        </EntitySheet>
      )}
    </>
  );
}
