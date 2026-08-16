import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import {
  exportInventoryXlsx,
  excelColumnFromWarehouseKey,
  type InventoryExportEnrichment,
} from '@crm/inventory';
import { connectDB, Product, StockLevel, Supplier, Warehouse, Category } from '@crm/db-core';
import { INVENTORY_PRODUCT_COLUMNS } from '@/lib/inventory/product-table-columns';
import { buildProductListFilter, parseSkuListParam } from '@/lib/inventory/product-list-filter';
import { getInventoryWarehouseScope } from '@/lib/inventory/warehouse-scope';

export type ExportProductScope = 'filtered' | 'selection' | 'all';
export type ExportAvailability = 'active' | 'all';
export type ExportStockScope = 'current' | 'all_scoped' | 'none';

export async function GET(request: Request) {
  await requirePermission('inventory:read');
  await connectDB();

  const url = new URL(request.url);
  const productScope = (url.searchParams.get('productScope') ?? 'filtered') as ExportProductScope;
  const availability = (url.searchParams.get('availability') ?? 'active') as ExportAvailability;
  const stockScope = (url.searchParams.get('stockScope') ?? 'all_scoped') as ExportStockScope;

  const scope = await getInventoryWarehouseScope();
  const showAllProducts = scope.isGlobal && availability === 'all';

  const warehouseIdParam = url.searchParams.get('warehouseId') ?? undefined;

  const rawParams: Record<string, string | string[] | undefined> = {};
  url.searchParams.forEach((value, key) => {
    if (['productScope', 'availability', 'stockScope', 'skus'].includes(key)) return;
    rawParams[key] = value;
  });

  let listFilter: Record<string, unknown>;

  if (productScope === 'selection') {
    const skus = parseSkuListParam(url.searchParams.get('skus'));
    if (!skus.length) {
      return NextResponse.json({ error: 'Nincs kijelölt termék.' }, { status: 400 });
    }
    const base = await buildProductListFilter({
      rawParams: {},
      columns: INVENTORY_PRODUCT_COLUMNS,
      showAllProducts,
      warehouseIdParam: undefined,
    });
    listFilter = { $and: [base, { sku: { $in: skus } }] };
  } else if (productScope === 'all') {
    listFilter = await buildProductListFilter({
      rawParams: {},
      columns: INVENTORY_PRODUCT_COLUMNS,
      showAllProducts,
      warehouseIdParam: undefined,
    });
  } else {
    listFilter = await buildProductListFilter({
      rawParams,
      columns: INVENTORY_PRODUCT_COLUMNS,
      showAllProducts,
      warehouseIdParam,
    });
  }

  const products = await Product.find(listFilter).sort({ sku: 1 }).lean().exec();
  if (!products.length) {
    return NextResponse.json({ error: 'Nincs exportálható termék.' }, { status: 404 });
  }

  const productIds = products.map((p) => p._id);

  const [warehouses, categories, suppliers, stockLevels, componentProducts] = await Promise.all([
    Warehouse.find({ isActive: true }).select({ key: 1 }).lean().exec(),
    Category.find().select({ slug: 1 }).lean().exec(),
    Supplier.find().select({ key: 1 }).lean().exec(),
    stockScope === 'none'
      ? Promise.resolve([])
      : StockLevel.find({ productId: { $in: productIds } })
          .select({ productId: 1, warehouseId: 1, onHand: 1 })
          .lean()
          .exec(),
    (async () => {
      const compIds = [
        ...new Set(products.flatMap((p) => (p.components ?? []).map((c) => String(c.productId)))),
      ];
      if (!compIds.length) return [];
      return Product.find({ _id: { $in: compIds } })
        .select({ sku: 1 })
        .lean()
        .exec();
    })(),
  ]);

  const keyByWarehouseId = new Map(warehouses.map((w) => [String(w._id), w.key]));
  const slugByCategoryId = new Map(categories.map((c) => [String(c._id), c.slug]));
  const keyBySupplierId = new Map(suppliers.map((s) => [String(s._id), s.key]));
  const skuByProductId = new Map(componentProducts.map((p) => [String(p._id), p.sku]));

  const warehouseSlugByProductId = new Map<string, string>();
  const categorySlugByProductId = new Map<string, string>();
  const supplierKeyByProductId = new Map<string, string>();
  const componentLinesByProductId = new Map<string, Array<{ sku: string; quantity: number }>>();

  for (const p of products) {
    const id = String(p._id);
    const whKeys = (p.warehouseIds ?? [])
      .map((wid) => keyByWarehouseId.get(String(wid)))
      .filter((k): k is string => Boolean(k));
    warehouseSlugByProductId.set(id, whKeys.join(','));
    const catId = p.categoryIds?.[0];
    if (catId) {
      const slug = slugByCategoryId.get(String(catId));
      if (slug) categorySlugByProductId.set(id, slug);
    }
    if (p.supplierId) {
      const sKey = keyBySupplierId.get(String(p.supplierId));
      if (sKey) supplierKeyByProductId.set(id, sKey);
    }
    const lines = (p.components ?? [])
      .map((c) => {
        const sku = skuByProductId.get(String(c.productId));
        if (!sku) return null;
        return { sku, quantity: c.quantity };
      })
      .filter((x): x is { sku: string; quantity: number } => x !== null);
    if (lines.length) componentLinesByProductId.set(id, lines);
  }

  const stockByProductId = new Map<string, Map<string, number>>();
  for (const sl of stockLevels) {
    const pid = String(sl.productId);
    const whKey = keyByWarehouseId.get(String(sl.warehouseId));
    if (!whKey) continue;
    if (!stockByProductId.has(pid)) stockByProductId.set(pid, new Map());
    stockByProductId.get(pid)!.set(whKey, sl.onHand ?? 0);
  }

  let stockWarehouseKeys: string[] = [];
  if (stockScope === 'none') {
    stockWarehouseKeys = [];
  } else if (stockScope === 'current' && warehouseIdParam) {
    const key = keyByWarehouseId.get(warehouseIdParam);
    if (key) stockWarehouseKeys = [key];
  } else if (stockScope === 'all_scoped') {
    const scopedKeys = scope.isGlobal
      ? warehouses.map((w) => w.key)
      : scope.warehouses.map((w) => w.key);
    stockWarehouseKeys = scopedKeys.filter((k) => excelColumnFromWarehouseKey(k));
    if (!stockWarehouseKeys.length) {
      stockWarehouseKeys = ['kispest', 'erzsebet', 'recsei'];
    }
  }

  const enrichment: InventoryExportEnrichment = {
    warehouseSlugByProductId,
    categorySlugByProductId,
    supplierKeyByProductId,
    stockByProductId,
    stockWarehouseKeys,
    componentLinesByProductId,
  };

  const buf = exportInventoryXlsx(products, enrichment);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `inventory-${productScope}-${stamp}.xlsx`;

  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
