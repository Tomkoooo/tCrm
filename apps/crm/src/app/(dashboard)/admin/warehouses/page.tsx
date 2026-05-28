import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { connectDB, Warehouse } from '@crm/db';
import { Container, DataTable, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Row = {
  _id: string;
  key: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
};

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('warehouses:read');
  await connectDB();

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<Row>> = [
    {
      key: 'key',
      label: 'Key',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'name',
      label: 'Name',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'isActive', label: 'Active', type: 'boolean', sortable: true, filterable: true },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const [items, total] = await Promise.all([
    Warehouse.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Warehouse.countDocuments(filter).exec(),
  ]);

  const data: Row[] = (items as any[]).map((w) => ({
    _id: String(w._id),
    key: w.key,
    name: w.name,
    isActive: Boolean(w.isActive),
    createdAt: w.createdAt,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground text-sm">Warehouse list and stock snapshots.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/permissions">RBAC</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Phase 1 seeds the 3 Alutent warehouses. Editing UI arrives in Phase 2.
          </p>
        </CardContent>
      </Card>

      <DataTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/admin/warehouses"
        rowHref={(r) => `/admin/warehouses/${r._id}`}
      />
    </Container>
  );
}
