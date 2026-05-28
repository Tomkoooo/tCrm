'use client';

import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';

export type UserRow = {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  roleNames: string;
  createdAt: Date;
};

export function UsersTable({
  data,
  columns,
  query,
  total,
  canManage,
}: {
  data: UserRow[];
  columns: Array<ColumnDef<UserRow>>;
  query: DataTableQuery;
  total: number;
  canManage: boolean;
}) {
  return (
    <DataTable<UserRow>
      tableId="admin-users"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/admin/users"
      rowHref={canManage ? (r) => `/admin/users/${r._id}` : undefined}
    />
  );
}
