'use client';

import { useState } from 'react';
import { DataTable, EntitySheet } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { CreateCompanyForm } from './company-form';

export type CompanyRow = {
  _id: string;
  name: string;
  slug: string;
  parentName?: string;
  isActive: boolean;
};

export function CompaniesTable({
  data,
  columns,
  query,
  total,
  parentCompanies,
}: {
  data: CompanyRow[];
  columns: Array<ColumnDef<CompanyRow>>;
  query: DataTableQuery;
  total: number;
  parentCompanies: { _id: string; name: string }[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DataTable<CompanyRow>
        mode="server"
        tableId="accounting-companies"
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/accounting/companies"
        rowHref={(row) => `/accounting/companies/${row._id}`}
        emptyMessage="Még nincs cég."
        toolbarExtra={
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Új cég
          </Button>
        }
      />
      <EntitySheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Új cég"
        description="Leányvállalat vagy csoporttag."
        mode="create"
      >
        <CreateCompanyForm
          parentCompanies={parentCompanies}
          onSuccess={() => setCreateOpen(false)}
        />
      </EntitySheet>
    </>
  );
}
