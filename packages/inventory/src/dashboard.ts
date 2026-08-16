import { connectDB, Product, StockLevel, Supplier, Warehouse } from '@crm/db-core';
import { productDisplayName } from '@crm/lib';
import mongoose from 'mongoose';
import { calculateBomAvailability } from './bom-availability';

export type InventoryDashboardSummary = {
  productCount: number;
  totalOnHandUnits: number;
  valuationHuf: number;
  valuationEur: number;
  lowStockItems: Array<{
    productId: string;
    sku: string;
    name: string;
    onHand: number;
    reserved: number;
    available: number;
  }>;
  buildsAvailability: Array<{
    productId: string;
    sku: string;
    name: string;
    canBuild: number;
    componentCount: number;
  }>;
  supplierBreakdown: Array<{ supplierName: string; productCount: number }>;
  warehouseBreakdown: Array<{ warehouseName: string; onHandUnits: number; valuationHuf: number }>;
};

export type InventoryDashboardOptions = {
  productFilter?: Record<string, unknown>;
  warehouseIds?: mongoose.Types.ObjectId[];
};

function unitPrice(p: {
  pricing?: {
    merchantPriceHuf?: number;
    streetPriceHuf?: number;
    merchantPriceEur?: number;
    streetPriceEur?: number;
  };
}) {
  return {
    huf: p.pricing?.merchantPriceHuf ?? p.pricing?.streetPriceHuf ?? 0,
    eur: p.pricing?.merchantPriceEur ?? p.pricing?.streetPriceEur ?? 0,
  };
}

function availableQty(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

export async function getInventoryDashboardSummary(
  options?: InventoryDashboardOptions
): Promise<InventoryDashboardSummary> {
  await connectDB();

  const productFilter = { isActive: true, ...(options?.productFilter ?? {}) };
  const levelFilter = options?.warehouseIds?.length
    ? { warehouseId: { $in: options.warehouseIds } }
    : {};

  const [productCountRaw, levels, suppliers, warehouses] = await Promise.all([
    Product.countDocuments(productFilter).exec(),
    StockLevel.find(levelFilter).lean().exec(),
    Supplier.find().select({ name: 1, key: 1 }).lean().exec(),
    options?.warehouseIds?.length
      ? Warehouse.find({ _id: { $in: options.warehouseIds }, isActive: true })
          .select({ name: 1 })
          .lean()
          .exec()
      : Warehouse.find({ isActive: true }).select({ name: 1 }).lean().exec(),
  ]);

  let productCount = productCountRaw;
  if (options?.warehouseIds?.length) {
    const stockedProductIds = await StockLevel.distinct('productId', levelFilter).exec();
    productCount = await Product.countDocuments({
      ...productFilter,
      _id: { $in: stockedProductIds },
    }).exec();
  }

  const productIds = [...new Set(levels.map((l) => String(l.productId)))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select({ sku: 1, names: 1, pricing: 1, components: 1, supplierId: 1 })
    .lean()
    .exec();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let totalOnHandUnits = 0;
  let valuationHuf = 0;
  let valuationEur = 0;
  const stockByProduct = new Map<string, { onHand: number; reserved: number }>();

  for (const level of levels) {
    const pid = String(level.productId);
    const prev = stockByProduct.get(pid) ?? { onHand: 0, reserved: 0 };
    prev.onHand += level.onHand;
    prev.reserved += level.reserved;
    stockByProduct.set(pid, prev);

    totalOnHandUnits += level.onHand;
    const product = productMap.get(pid);
    if (product) {
      const price = unitPrice(product);
      valuationHuf += level.onHand * price.huf;
      valuationEur += level.onHand * price.eur;
    }
  }

  const lowStockItems = [...stockByProduct.entries()]
    .map(([productId, stock]) => {
      const product = productMap.get(productId);
      if (!product) return null;
      const available = availableQty(stock.onHand, stock.reserved);
      return {
        productId,
        sku: product.sku,
        name: productDisplayName(product.names, product.sku),
        onHand: stock.onHand,
        reserved: stock.reserved,
        available,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.available <= 5)
    .sort((a, b) => a.available - b.available)
    .slice(0, 15);

  const builds = await Product.find({
    ...productFilter,
    'components.0': { $exists: true },
  })
    .select({ sku: 1, names: 1, components: 1 })
    .limit(50)
    .lean()
    .exec();

  const buildsAvailability = (
    await Promise.all(
      builds.map(async (b) => {
        const avail = await calculateBomAvailability(b._id);
        return {
          productId: String(b._id),
          sku: b.sku,
          name: productDisplayName(b.names, b.sku),
          canBuild: avail.canBuild,
          componentCount: b.components?.length ?? 0,
        };
      })
    )
  )
    .sort((a, b) => a.canBuild - b.canBuild)
    .slice(0, 15);

  const supplierCounts = new Map<string, number>();
  const allProducts = await Product.find(productFilter).select({ supplierId: 1 }).lean().exec();
  for (const p of allProducts) {
    const key = p.supplierId ? String(p.supplierId) : 'none';
    supplierCounts.set(key, (supplierCounts.get(key) ?? 0) + 1);
  }
  const supplierNameMap = new Map(suppliers.map((s) => [String(s._id), s.name]));
  const supplierBreakdown = [...supplierCounts.entries()]
    .map(([id, count]) => ({
      supplierName: id === 'none' ? '(nincs beszállító)' : (supplierNameMap.get(id) ?? id),
      productCount: count,
    }))
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 10);

  const warehouseBreakdown = warehouses.map((wh) => {
    const whLevels = levels.filter((l) => String(l.warehouseId) === String(wh._id));
    let onHandUnits = 0;
    let whValHuf = 0;
    for (const level of whLevels) {
      onHandUnits += level.onHand;
      const product = productMap.get(String(level.productId));
      if (product) {
        whValHuf += level.onHand * unitPrice(product).huf;
      }
    }
    return { warehouseName: wh.name, onHandUnits, valuationHuf: whValHuf };
  });

  return {
    productCount,
    totalOnHandUnits,
    valuationHuf,
    valuationEur,
    lowStockItems,
    buildsAvailability,
    supplierBreakdown,
    warehouseBreakdown,
  };
}
