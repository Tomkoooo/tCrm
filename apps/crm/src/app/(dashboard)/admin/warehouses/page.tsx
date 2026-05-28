import Link from 'next/link';
import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Warehouse } from '@crm/db';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { WarehousesTable, type WarehouseRow } from './_components/warehouses-table';

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('warehouses:read');
  await connectDB();

  const canManage = await hasPermission('warehouses:manage');
  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<WarehouseRow>> = [
    {
      key: 'key',
      label: 'Kulcs',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'isActive', label: 'Aktív', type: 'boolean', sortable: true, filterable: true },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const [items, total] = await Promise.all([
    Warehouse.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Warehouse.countDocuments(filter).exec(),
  ]);

  const data: WarehouseRow[] = items.map((w) => ({
    _id: String(w._id),
    key: w.key,
    name: w.name,
    isActive: Boolean(w.isActive),
    createdAt: w.createdAt,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Raktárak</h1>
          <p className="text-muted-foreground text-sm">Raktárak és készletszintek.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/permissions">Jogosultságok</Link>
        </Button>
      </div>

      <WarehousesTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        canManage={canManage}
      />
    </Container>
  );
}
