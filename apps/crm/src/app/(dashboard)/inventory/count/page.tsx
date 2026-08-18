import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Category, Product, StockLevel } from '@crm/db-core';
import { productDisplayName } from '@crm/lib';
import { Container, buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';

import { flattenCategoryOptions } from '@/lib/inventory/category-options';
import {
  buildScopedProductFilter,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';
import { QuickProductEntry } from '../_components/quick-product-entry';
import { CountQuickBar } from './_components/count-quick-bar';
import { CountTable, type CountTableRow } from './_components/count-table';

const COUNT_COLUMNS: Array<ColumnDef<CountTableRow>> = [
  {
    key: 'sku',
    label: 'Termék',
    mongoKey: 'sku',
    searchable: true,
    sortable: true,
    defaultVisible: true,
  },
  {
    key: 'name_hu',
    label: 'Név',
    mongoKey: 'names.hu',
    searchable: true,
    sortable: true,
    defaultVisible: false,
    hideable: true,
  },
  {
    key: 'onHand',
    label: 'Mennyiség',
    type: 'number',
    sortable: false,
    filterable: false,
    searchable: false,
    align: 'right',
    defaultVisible: true,
    hideable: false,
    headerHint: 'Abszolút darabszám ebben a raktárban. Enter vagy fókuszvesztés ment.',
  },
];

export default async function InventoryCountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('inventory:read');
  await connectDB();

  const canWrite = await hasPermission('inventory:write');
  const rawParams = await searchParams;
  const scope = await getInventoryWarehouseScope();
  const warehouseIdParam =
    typeof rawParams.warehouseId === 'string' ? rawParams.warehouseId : undefined;
  const warehouseId =
    warehouseIdParam && scope.warehouseIds.includes(warehouseIdParam)
      ? warehouseIdParam
      : scope.warehouses[0]?.id;

  const query = parseDataTableQuery(rawParams);
  if (!query.sort) query.sort = 'name_hu';

  const categories = flattenCategoryOptions(
    await Category.find().sort({ level: 1, slug: 1 }).lean().exec()
  );

  if (!warehouseId) {
    return (
      <Container className="flex max-w-6xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leltár</h1>
          <p className="text-muted-foreground text-sm">
            Nincs elérhető raktár. Kérj raktár-hozzárendelést, vagy hozd létre a raktárat az
            Adminisztráció → Raktárak oldalon.
          </p>
        </div>
      </Container>
    );
  }

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, COUNT_COLUMNS);
  const listFilter = await buildScopedProductFilter({ ...filter, isActive: true });

  const [items, total] = await Promise.all([
    Product.find(listFilter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select({ sku: 1, names: 1 })
      .lean()
      .exec(),
    Product.countDocuments(listFilter).exec(),
  ]);

  const stockLevels =
    items.length > 0
      ? await StockLevel.find({
          productId: { $in: items.map((p) => p._id) },
          warehouseId,
        })
          .select({ productId: 1, onHand: 1 })
          .lean()
          .exec()
      : [];
  const onHandByProduct = new Map(stockLevels.map((l) => [String(l.productId), l.onHand ?? 0]));

  const data: CountTableRow[] = items.map((p) => {
    const name = productDisplayName(p.names, p.sku);
    return {
      productId: String(p._id),
      sku: p.sku,
      name,
      name_hu: p.names?.hu,
      onHand: onHandByProduct.get(String(p._id)) ?? 0,
    };
  });

  const warehouseName = scope.warehouses.find((w) => w.id === warehouseId)?.name ?? 'raktár';

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leltár</h1>
          <p className="text-muted-foreground text-sm">
            {warehouseName} · {total} termék · a mennyiség abszolút darabszám (nem plusz/mínusz).
          </p>
        </div>
        {canWrite ? (
          <QuickProductEntry
            categories={categories}
            warehouses={scope.warehouses}
            defaultWarehouseId={warehouseId}
            lockWarehouse
          />
        ) : null}
      </div>

      {canWrite ? <CountQuickBar warehouseId={warehouseId} /> : null}

      <CountTable
        data={data}
        columns={COUNT_COLUMNS}
        query={query}
        total={total}
        warehouses={scope.warehouses}
        warehouseId={warehouseId}
        canWrite={canWrite}
      />
    </Container>
  );
}
