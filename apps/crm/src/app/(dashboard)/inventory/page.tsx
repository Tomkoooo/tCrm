import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { connectDB, Product } from '@crm/db';
import { Container, DataTable, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { Button } from '@/components/ui/button';

type Row = {
  sku: string;
  internalSku?: string;
  brand?: string;
  name_en?: string;
  name_hu?: string;
  ean?: string;
  isActive: boolean;
  isDiscontinued: boolean;
  createdAt: Date;
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('inventory:read');
  await connectDB();

  const query = parseDataTableQuery(await searchParams);

  const columns: Array<ColumnDef<Row>> = [
    {
      key: 'internalSku',
      label: 'Internal SKU',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'sku',
      label: 'Manufacturer SKU',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'brand',
      label: 'Brand',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'name_en',
      label: 'Name (EN)',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'name_hu',
      label: 'Name (HU)',
      type: 'string',
      sortable: true,
      filterable: false,
      searchable: true,
    },
    { key: 'isActive', label: 'Active', type: 'boolean', sortable: true, filterable: true },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);

  // map table keys to real document paths
  const mappedFilter: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filter)) {
    if (k === 'name_en') mappedFilter['names.en'] = v;
    else if (k === 'name_hu') mappedFilter['names.hu'] = v;
    else if (k === 'internalSku') mappedFilter['internalSku'] = v;
    else mappedFilter[k] = v;
  }

  const mappedSort: Record<string, 1 | -1> = {};
  for (const [k, v] of Object.entries(sort)) {
    if (k === 'name_en') mappedSort['names.en'] = v;
    else if (k === 'name_hu') mappedSort['names.hu'] = v;
    else if (k === 'internalSku') mappedSort['internalSku'] = v;
    else mappedSort[k] = v;
  }

  const [items, total] = await Promise.all([
    Product.find(mappedFilter)
      .sort(mappedSort)
      .skip(skip)
      .limit(limit)
      .lean()
      .select({
        sku: 1,
        internalSku: 1,
        brand: 1,
        names: 1,
        ean: 1,
        isActive: 1,
        isDiscontinued: 1,
        createdAt: 1,
      })
      .exec(),
    Product.countDocuments(mappedFilter).exec(),
  ]);

  const data: Row[] = items.map((p: any) => ({
    sku: p.sku,
    internalSku: p.internalSku,
    brand: p.brand,
    name_en: p.names?.en,
    name_hu: p.names?.hu,
    ean: p.ean,
    isActive: Boolean(p.isActive),
    isDiscontinued: Boolean(p.isDiscontinued),
    createdAt: p.createdAt,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">
            Products and stock across warehouses. Use Import for Alutent.xlsx bulk load.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory/import">Import Excel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inventory/export">Export Excel</Link>
          </Button>
          <Button asChild>
            <Link href="/inventory/new">New product</Link>
          </Button>
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        basePath="/inventory"
        rowHref={(r) => `/inventory/${r.sku}`}
      />
    </Container>
  );
}
