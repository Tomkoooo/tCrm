import { connectDB, Product, StockLevel, Warehouse, type IDemandLine } from '@crm/db-core';
import mongoose from 'mongoose';
import { availableQty } from './stock-helpers';
import { catalogComponentsForProduct } from './demand-explode';

export type DemandAvailabilityComponent = {
  productId: string;
  sku: string;
  name: string;
  quantityPerKit: number;
  required: number;
  available: number;
  shortage: number;
};

export type DemandAvailabilityRow = {
  productId?: string;
  sku: string;
  name: string;
  requested: number;
  available: number;
  shortage: number;
  isKit: boolean;
  kitOverridden: boolean;
  components: DemandAvailabilityComponent[];
};

function displayName(
  p: { sku?: string; names?: { hu?: string; en?: string } } | undefined,
  fallback: string
) {
  if (!p) return fallback;
  return p.names?.hu ?? p.names?.en ?? p.sku ?? fallback;
}

async function stockMap(productIds: mongoose.Types.ObjectId[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of productIds) map.set(String(id), 0);
  if (!productIds.length) return map;
  const levels = await StockLevel.find({ productId: { $in: productIds } })
    .lean()
    .exec();
  for (const level of levels) {
    const key = String(level.productId);
    map.set(
      key,
      (map.get(key) ?? 0) + availableQty({ onHand: level.onHand, reserved: level.reserved })
    );
  }
  return map;
}

export async function loadCatalogBom(productId: mongoose.Types.ObjectId): Promise<{
  productId: string;
  sku: string;
  name: string;
  components: DemandAvailabilityComponent[];
} | null> {
  await connectDB();
  const product = await Product.findById(productId)
    .select({ sku: 1, names: 1, components: 1 })
    .lean()
    .exec();
  if (!product) return null;
  const componentIds = (product.components ?? []).map((c) => c.productId);
  const comps = componentIds.length
    ? await Product.find({ _id: { $in: componentIds } })
        .select({ sku: 1, names: 1 })
        .lean()
        .exec()
    : [];
  const map = new Map(comps.map((p) => [String(p._id), p]));
  const stock = await stockMap(componentIds);
  return {
    productId: String(product._id),
    sku: product.sku,
    name: displayName(product, product.sku),
    components: (product.components ?? []).map((c) => {
      const p = map.get(String(c.productId));
      const available = stock.get(String(c.productId)) ?? 0;
      return {
        productId: String(c.productId),
        sku: p?.sku ?? '—',
        name: displayName(p, '—'),
        quantityPerKit: c.quantity,
        required: c.quantity,
        available,
        shortage: Math.max(0, c.quantity - available),
      };
    }),
  };
}

export async function previewDemandAvailability(
  demand: IDemandLine[]
): Promise<DemandAvailabilityRow[]> {
  await connectDB();
  if (!demand.length) return [];

  const catalogIds = demand.map((d) => d.productId).filter(Boolean) as mongoose.Types.ObjectId[];
  const kitIds = demand.flatMap((d) => (d.kit?.components ?? []).map((c) => c.productId));
  const products = await Product.find({ _id: { $in: [...catalogIds, ...kitIds] } })
    .select({ sku: 1, names: 1, components: 1 })
    .lean()
    .exec();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const extraCatalogComponentIds = catalogIds.flatMap((id) =>
    (productMap.get(String(id))?.components ?? []).map((c) => c.productId)
  );
  const allStockIds = [
    ...new Set([...catalogIds, ...kitIds, ...extraCatalogComponentIds].map(String)),
  ].map((id) => new mongoose.Types.ObjectId(id));
  const stock = await stockMap(allStockIds);

  return demand.map((line) => {
    const catalog = line.productId ? productMap.get(String(line.productId)) : undefined;
    const kitOverridden = Boolean(line.kit?.components?.length);
    const rawComponents = kitOverridden
      ? line.kit!.components
      : catalogComponentsForProduct(line.productId, productMap);
    const isKit = rawComponents.length > 0 || Boolean(line.kit);
    const components: DemandAvailabilityComponent[] = rawComponents.map((c) => {
      const p = productMap.get(String(c.productId));
      const required = c.quantity * line.requestedQuantity;
      const available = stock.get(String(c.productId)) ?? 0;
      return {
        productId: String(c.productId),
        sku: p?.sku ?? '—',
        name: displayName(p, '—'),
        quantityPerKit: c.quantity,
        required,
        available,
        shortage: Math.max(0, required - available),
      };
    });

    const ownAvailable = line.productId ? (stock.get(String(line.productId)) ?? 0) : 0;
    const componentCanBuild = components.length
      ? Math.min(...components.map((c) => Math.floor(c.available / (c.quantityPerKit || 1))))
      : ownAvailable;
    const available = isKit ? Math.max(0, componentCanBuild) : ownAvailable;
    const shortage = Math.max(0, line.requestedQuantity - available);

    return {
      productId: line.productId ? String(line.productId) : undefined,
      sku: catalog?.sku ?? (line.kit?.name ? 'egyedi' : '—'),
      name: line.kit?.name || displayName(catalog, 'Egyedi összeállítás'),
      requested: line.requestedQuantity,
      available,
      shortage,
      isKit,
      kitOverridden,
      components,
    };
  });
}

export type PickupWarehouseIssue = {
  warehouseId: string;
  warehouseName: string;
  productId: string;
  sku: string;
  name: string;
  requested: number;
  available: number;
};

export async function previewPickupWarehouseIssues(
  pickups: Array<{
    warehouseId: mongoose.Types.ObjectId | string;
    lines: Array<{ productId: mongoose.Types.ObjectId | string; requestedQuantity: number }>;
  }>
): Promise<PickupWarehouseIssue[]> {
  await connectDB();
  if (!pickups.length) return [];

  const warehouseIds = [...new Set(pickups.map((p) => String(p.warehouseId)))].map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  const productIds = [
    ...new Set(pickups.flatMap((p) => p.lines.map((l) => String(l.productId)))),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const [warehouses, products, levels] = await Promise.all([
    Warehouse.find({ _id: { $in: warehouseIds } })
      .select({ name: 1, key: 1 })
      .lean()
      .exec(),
    productIds.length
      ? Product.find({ _id: { $in: productIds } })
          .select({ sku: 1, names: 1 })
          .lean()
          .exec()
      : [],
    productIds.length
      ? StockLevel.find({ warehouseId: { $in: warehouseIds }, productId: { $in: productIds } })
          .lean()
          .exec()
      : [],
  ]);

  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w]));
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const stockKey = (productId: string, warehouseId: string) => `${productId}::${warehouseId}`;
  const stock = new Map<string, number>();
  for (const level of levels) {
    const key = stockKey(String(level.productId), String(level.warehouseId));
    stock.set(
      key,
      (stock.get(key) ?? 0) + availableQty({ onHand: level.onHand, reserved: level.reserved })
    );
  }

  const claimed = new Map<string, number>();
  for (const pickup of pickups) {
    const warehouseId = String(pickup.warehouseId);
    for (const line of pickup.lines) {
      const key = stockKey(String(line.productId), warehouseId);
      claimed.set(key, (claimed.get(key) ?? 0) + line.requestedQuantity);
    }
  }

  const issues: PickupWarehouseIssue[] = [];
  for (const [key, requested] of claimed) {
    const sep = key.indexOf('::');
    const productId = key.slice(0, sep);
    const warehouseId = key.slice(sep + 2);
    const available = stock.get(key) ?? 0;
    if (available >= requested) continue;
    const p = productMap.get(productId);
    const w = warehouseMap.get(warehouseId);
    issues.push({
      warehouseId,
      warehouseName: w ? `${w.name} (${w.key})` : '—',
      productId,
      sku: p?.sku && p.sku !== productId ? p.sku : '—',
      name: displayName(p, 'Ismeretlen tétel'),
      requested,
      available,
    });
  }
  return issues;
}
