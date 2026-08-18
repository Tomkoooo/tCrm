'use client';

import { useState } from 'react';
import { DataTable, EntitySheet, Button } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { CreateEmployeeForm } from './employee-form';

export type PeopleRow = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  scheduleMode?: string;
  isActive: boolean;
  hasLogin: boolean;
};

export function PeopleTable({
  data,
  columns,
  query,
  total,
  canWrite,
  companies,
  defaultCompanyId,
}: {
  data: PeopleRow[];
  columns: Array<ColumnDef<PeopleRow>>;
  query: DataTableQuery;
  total: number;
  canWrite: boolean;
  companies: Array<{ id: string; name: string }>;
  defaultCompanyId?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DataTable<PeopleRow>
        mode="server"
        tableId="hr-people"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/hr/people"
        rowHref={(row) => `/hr/people/${row._id}`}
        emptyMessage="Még nincs dolgozó."
        toolbarExtra={
          canWrite ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új dolgozó
            </Button>
          ) : undefined
        }
      />
      {canWrite ? (
        <EntitySheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Új dolgozó"
          description="Egy sor = egy céges tagság."
          size="md"
          mode="create"
        >
          <CreateEmployeeForm
            companies={companies}
            defaultCompanyId={defaultCompanyId}
            onSuccess={() => setCreateOpen(false)}
          />
        </EntitySheet>
      ) : null}
    </>
  );
}
