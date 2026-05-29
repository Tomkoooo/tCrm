import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Product, Warehouse } from '@crm/db';
import { Container, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import { resolveProductThumbnailUrl } from '@/lib/product-thumbnail';
import {
  INVENTORY_PRODUCT_COLUMNS,
  INVENTORY_PRODUCT_SELECT,
  mapProductToTableRow,
} from '@/lib/inventory/product-table-columns';
import {
  buildScopedProductFilter,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';
import { InventoryToolbar } from './_components/inventory-toolbar';
import { InventoryTable } from './_components/inventory-table';
import { WarehouseFilter } from './_components/warehouse-filter';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('inventory:read');
  await connectDB();

  const canImport = await hasPermission('inventory:import');
  const rawParams = await searchParams;
  const warehouseIdParam =
    typeof rawParams.warehouseId === 'string' ? rawParams.warehouseId : undefined;

  const scope = await getInventoryWarehouseScope();
  const query = parseDataTableQuery(rawParams);
  const columns = INVENTORY_PRODUCT_COLUMNS;

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const listFilter = await buildScopedProductFilter(filter, warehouseIdParam);

  const warehouseDocs =
    scope.warehouseIds.length > 0
      ? await Warehouse.find({ _id: { $in: scope.warehouseIds } })
          .select({ key: 1 })
          .lean()
          .exec()
      : [];
  const warehouseKeyById = new Map(warehouseDocs.map((w) => [String(w._id), w.key]));

  const [items, total] = await Promise.all([
    Product.find(listFilter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .select({ ...INVENTORY_PRODUCT_SELECT, warehouseIds: 1 })
      .exec(),
    Product.countDocuments(listFilter).exec(),
  ]);

  const data = items.map((p) =>
    mapProductToTableRow(
      p,
      resolveProductThumbnailUrl(p),
      (p.warehouseIds ?? []).map((id) => warehouseKeyById.get(String(id)) ?? String(id))
    )
  );

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <h1 className="text-2xl font-bold">Készlet</h1>
          <WarehouseFilter warehouses={scope.warehouses} selectedId={warehouseIdParam} />
        </div>
        <InventoryToolbar canImport={canImport} />
      </div>

      <InventoryTable data={data} columns={columns} query={query} total={total} />
    </Container>
  );
}
