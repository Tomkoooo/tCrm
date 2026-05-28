'use client';

import { useState } from 'react';
import { DataTable, EntitySheet } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { CreateSecretProjectForm } from './secret-project-form';

export type SecretProjectRow = {
  _id: string;
  name: string;
  description: string;
  secretCount: number;
  isOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function SecretsTable({
  data,
  columns,
  query,
  total,
  canWrite,
}: {
  data: SecretProjectRow[];
  columns: Array<ColumnDef<SecretProjectRow>>;
  query: DataTableQuery;
  total: number;
  canWrite: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DataTable<SecretProjectRow>
        mode="server"
        tableId="secrets-projects"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/secrets"
        rowHref={(r) => `/secrets/${r._id}`}
        toolbarExtra={
          canWrite ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új projekt
            </Button>
          ) : undefined
        }
      />
      {canWrite && (
        <EntitySheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Új titok projekt"
          size="md"
          mode="create"
        >
          <CreateSecretProjectForm onSuccess={() => setCreateOpen(false)} />
        </EntitySheet>
      )}
    </>
  );
}
