'use client';

import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';

export type MailTemplateRow = {
  _id: string;
  key: string;
  subject: string;
  enabled: boolean;
  description: string;
};

export function MailTemplatesTable({
  data,
  columns,
  query,
  total,
}: {
  data: MailTemplateRow[];
  columns: Array<ColumnDef<MailTemplateRow>>;
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<MailTemplateRow>
      tableId="admin-mail-templates"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/admin/mail-templates"
      rowHref={(r) => `/admin/mail-templates/${r._id}`}
    />
  );
}
