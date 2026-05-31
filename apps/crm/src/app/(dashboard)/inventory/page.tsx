import Link from 'next/link';
import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Product, StockLevel, Warehouse } from '@crm/db';
import { Container, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { resolveProductThumbnailUrl } from '@/lib/product-thumbnail';
import {
  formatProductStockSummary,
  INVENTORY_PRODUCT_COLUMNS,
  INVENTORY_PRODUCT_SELECT,
  mapProductToTableRow,
  warehouseDisplayLabel,
} from '@/lib/inventory/product-table-columns';
import {
  buildScopedProductFilter,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';
import { InventoryTable } from './_components/inventory-table';

function inventorySummary(
  total: number,
  showAllProducts: boolean,
  hasWarehouseFilter: boolean,
  hasSearch: boolean
): string {
  if (total === 0) {
    return 'Még nincs termék — importáljon Excelből vagy hozzon létre újat.';
  }
  const parts = [`${total} termék`];
  if (!showAllProducts) parts.push('csak aktív');
  if (hasWarehouseFilter) parts.push('raktár szerint szűrve');
  if (hasSearch) parts.push('keresési találat');
  return parts.join(' · ');
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('inventory:read');
  await connectDB();

  const canImport = await hasPermission('inventory:import');
  const canWrite = await hasPermission('inventory:write');
  const canDelete = await hasPermission('inventory:delete');
  const rawParams = await searchParams;
  const warehouseIdParam =
    typeof rawParams.warehouseId === 'string' ? rawParams.warehouseId : undefined;
  const searchParam = typeof rawParams.search === 'string' ? rawParams.search.trim() : '';

  const scope = await getInventoryWarehouseScope();
  const showAllProducts =
    scope.isGlobal && typeof rawParams.showAll === 'string' && rawParams.showAll === 'true';
  const query = parseDataTableQuery(rawParams);
  const columns = INVENTORY_PRODUCT_COLUMNS;

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const activeFilter = showAllProducts ? {} : { isActive: true };
  const listFilter = await buildScopedProductFilter(
    { ...filter, ...activeFilter },
    warehouseIdParam
  );

  const warehouseDocs =
    scope.warehouseIds.length > 0
      ? await Warehouse.find({ _id: { $in: scope.warehouseIds } })
          .select({ key: 1 })
          .lean()
          .exec()
      : [];
  const warehouseKeyById = new Map(warehouseDocs.map((w) => [String(w._id), w.key]));

  const warehouseNameById = new Map(scope.warehouses.map((w) => [w.id, w.name]));

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

  const productIds = items.map((p) => p._id);
  const stockLevels =
    productIds.length > 0
      ? await StockLevel.find({
          productId: { $in: productIds },
          onHand: { $gt: 0 },
        })
          .select({ productId: 1, warehouseId: 1, onHand: 1 })
          .lean()
          .exec()
      : [];

  const stockEntriesByProductId = new Map<
    string,
    Array<{ warehouseName: string; onHand: number }>
  >();
  for (const level of stockLevels) {
    const productId = String(level.productId);
    const warehouseName = warehouseNameById.get(String(level.warehouseId));
    if (!warehouseName) continue;
    const list = stockEntriesByProductId.get(productId) ?? [];
    list.push({ warehouseName, onHand: level.onHand ?? 0 });
    stockEntriesByProductId.set(productId, list);
  }

  const data = items.map((p) => {
    const productId = String(p._id);
    const stockEntries = stockEntriesByProductId.get(productId) ?? [];
    stockEntries.sort((a, b) =>
      warehouseDisplayLabel(a.warehouseName).localeCompare(
        warehouseDisplayLabel(b.warehouseName),
        'hu'
      )
    );
    return mapProductToTableRow(
      p,
      resolveProductThumbnailUrl(p),
      (p.warehouseIds ?? []).map((id) => warehouseKeyById.get(String(id)) ?? String(id)),
      formatProductStockSummary(stockEntries)
    );
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Készlet</h1>
          <p className="text-muted-foreground text-sm">
            {inventorySummary(
              total,
              showAllProducts,
              Boolean(warehouseIdParam),
              Boolean(searchParam)
            )}
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/inventory/new">Új termék</Link>
          </Button>
        )}
      </div>

      <InventoryTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        canEditActive={canWrite}
        canWrite={canWrite}
        canDelete={canDelete}
        warehouses={scope.warehouses}
        warehouseId={warehouseIdParam}
        canImport={canImport}
        canViewAllProducts={scope.isGlobal}
        showAllProducts={showAllProducts}
        canBulkUpdate={canWrite}
      />
    </Container>
  );
}
