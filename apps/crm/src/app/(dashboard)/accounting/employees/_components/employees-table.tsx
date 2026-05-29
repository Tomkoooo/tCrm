'use client';

import { useState } from 'react';
import { DataTable, EntitySheet } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { CreateEmployeeForm } from './employee-form';

export type EmployeeRow = {
  _id: string;
  name: string;
  companyName: string;
  email?: string;
  department?: string;
  employmentType: string;
  isActive: boolean;
  hasUser: boolean;
};

export function EmployeesTable({
  data,
  columns,
  query,
  total,
  canWrite,
  companies,
}: {
  data: EmployeeRow[];
  columns: Array<ColumnDef<EmployeeRow>>;
  query: DataTableQuery;
  total: number;
  canWrite: boolean;
  companies: { _id: string; name: string }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DataTable<EmployeeRow>
        mode="server"
        tableId="accounting-employees"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/accounting/employees"
        rowHref={(row) => `/accounting/employees/${row._id}`}
        emptyMessage="Még nincs dolgozó."
        toolbarExtra={
          canWrite ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új dolgozó
            </Button>
          ) : undefined
        }
      />
      {canWrite && (
        <EntitySheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Új dolgozó"
          description="Vendég vagy később meghívott dolgozó."
          size="lg"
          mode="create"
        >
          <CreateEmployeeForm companies={companies} onSuccess={() => setCreateOpen(false)} />
        </EntitySheet>
      )}
    </>
  );
}
