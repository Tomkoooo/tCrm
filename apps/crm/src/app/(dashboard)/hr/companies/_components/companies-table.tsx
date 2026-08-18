'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Input, Label, Textarea, EntitySheet, DataTable, cn } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { createCompanyAction, updateCompanyAction, type HrFormState } from '../../actions';

const initial: HrFormState = { success: false };
const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm'
);

export type CompanyRow = {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

function CompanyForm({ company, onSuccess }: { company?: CompanyRow; onSuccess?: () => void }) {
  const actionFn = company ? updateCompanyAction : createCompanyAction;
  const [state, action, pending] = useActionState(actionFn, initial);
  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-3">
      {company ? <input type="hidden" name="id" value={company._id} /> : null}
      {state.message ? (
        <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Név</Label>
        <Input id="name" name="name" required defaultValue={company?.name ?? ''} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug (opcionális)</Label>
        <Input id="slug" name="slug" defaultValue={company?.slug ?? ''} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="isActive">Státusz</Label>
        <select
          id="isActive"
          name="isActive"
          className={selectClassName}
          defaultValue={company?.isActive === false ? 'false' : 'true'}
        >
          <option value="true">Aktív</option>
          <option value="false">Inaktív</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Megjegyzés</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <Button type="submit" loading={pending}>
        Mentés
      </Button>
    </form>
  );
}

export function CompaniesTable({
  data,
  columns,
  query,
  total,
}: {
  data: CompanyRow[];
  columns: Array<ColumnDef<CompanyRow>>;
  query: DataTableQuery;
  total: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<CompanyRow | null>(null);

  return (
    <>
      <DataTable<CompanyRow>
        mode="server"
        tableId="hr-companies"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/hr/companies"
        emptyMessage="Még nincs cég."
        toolbarExtra={
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Új cég
          </Button>
        }
        rowDetail={{
          title: (row) => row.name,
          render: (row) => (
            <Button type="button" size="sm" variant="outline" onClick={() => setEdit(row)}>
              Szerkesztés
            </Button>
          ),
        }}
      />
      <EntitySheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Új cég"
        size="md"
        mode="create"
      >
        <CompanyForm onSuccess={() => setCreateOpen(false)} />
      </EntitySheet>
      <EntitySheet
        open={Boolean(edit)}
        onOpenChange={(o) => !o && setEdit(null)}
        title="Cég szerkesztése"
        size="md"
        mode="edit"
      >
        {edit ? <CompanyForm company={edit} onSuccess={() => setEdit(null)} /> : null}
      </EntitySheet>
    </>
  );
}
