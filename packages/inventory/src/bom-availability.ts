import { connectDB, Product, StockLevel, type IProduct } from '@crm/db-core';
import type { Types } from 'mongoose';

export type ComponentAvailability = {
  productId: Types.ObjectId;
  available: number;
  required: number;
};

export type BomAvailability = {
  productId: Types.ObjectId;
  canBuild: number;
  limitingComponents: ComponentAvailability[];
};

function availableQty(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

export function computeBomAvailabilityFromComponents(
  productId: Types.ObjectId,
  components: Array<{ productId: Types.ObjectId; quantity: number }>,
  stockByProduct: Map<string, number>
): BomAvailability {
  if (!components.length) {
    const own = stockByProduct.get(productId.toString()) ?? 0;
    return { productId, canBuild: Math.floor(own), limitingComponents: [] };
  }

  let canBuild = Number.POSITIVE_INFINITY;
  const limitingComponents: ComponentAvailability[] = [];

  for (const comp of components) {
    const available = stockByProduct.get(comp.productId.toString()) ?? 0;
    const builds = Math.floor(available / comp.quantity);
    if (builds < canBuild) {
      canBuild = builds;
    }
    limitingComponents.push({
      productId: comp.productId,
      available,
      required: comp.quantity,
    });
  }

  if (!Number.isFinite(canBuild)) canBuild = 0;

  const sorted = [...limitingComponents].sort((a, b) => {
    const ratioA = a.available / a.required;
    const ratioB = b.available / b.required;
    return ratioA - ratioB;
  });

  return {
    productId,
    canBuild: Math.max(0, canBuild),
    limitingComponents: sorted,
  };
}

async function loadAvailableStock(
  productIds: Types.ObjectId[],
  warehouseId?: Types.ObjectId
): Promise<Map<string, number>> {
  const filter: Record<string, unknown> = { productId: { $in: productIds } };
  if (warehouseId) filter.warehouseId = warehouseId;

  const levels = await StockLevel.find(filter).lean().exec();
  const map = new Map<string, number>();

  for (const id of productIds) {
    map.set(id.toString(), 0);
  }

  for (const level of levels) {
    const key = String(level.productId);
    const avail = availableQty(level.onHand, level.reserved);
    map.set(key, (map.get(key) ?? 0) + avail);
  }

  return map;
}

export async function calculateBomAvailability(
  productId: Types.ObjectId,
  warehouseId?: Types.ObjectId
): Promise<BomAvailability> {
  await connectDB();

  const product = await Product.findById(productId).lean<IProduct>().exec();
  if (!product) {
    throw new Error('Product not found');
  }

  const componentIds = product.components.map((c) => c.productId);
  const allIds = [productId, ...componentIds];
  const stockByProduct = await loadAvailableStock(allIds, warehouseId);

  return computeBomAvailabilityFromComponents(productId, product.components, stockByProduct);
}
