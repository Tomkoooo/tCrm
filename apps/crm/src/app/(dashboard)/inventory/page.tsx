import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Product } from '@crm/db';
import { Container, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import { resolveProductThumbnailUrl } from '@/lib/product-thumbnail';
import {
  INVENTORY_PRODUCT_COLUMNS,
  INVENTORY_PRODUCT_SELECT,
  mapProductToTableRow,
} from '@/lib/inventory/product-table-columns';
import { InventoryToolbar } from './_components/inventory-toolbar';
import { InventoryTable } from './_components/inventory-table';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('inventory:read');
  await connectDB();

  const canImport = await hasPermission('inventory:import');
  const query = parseDataTableQuery(await searchParams);
  const columns = INVENTORY_PRODUCT_COLUMNS;

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .select(INVENTORY_PRODUCT_SELECT)
      .exec(),
    Product.countDocuments(filter).exec(),
  ]);

  const data = items.map((p) => mapProductToTableRow(p, resolveProductThumbnailUrl(p)));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Készlet</h1>
        <InventoryToolbar canImport={canImport} />
      </div>

      <InventoryTable data={data} columns={columns} query={query} total={total} />
    </Container>
  );
}
