import mongoose, { type Types } from 'mongoose';
import type { IDemandLine, IDemandKitComponent } from '@crm/db-core';

export type PhysicalDemandLine = {
  productId: Types.ObjectId;
  requestedQuantity: number;
  isOptional?: boolean;
};

type CatalogProduct = {
  _id: Types.ObjectId;
  components?: Array<{ productId: Types.ObjectId; quantity: number }>;
};

/** Job-local kit (edited or ad-hoc) is exploded; catalog BOMs stay as the parent SKU. */
export function explodeDemandLines(
  demand: IDemandLine[],
  _productMap: Map<string, CatalogProduct>
): PhysicalDemandLine[] {
  const out: PhysicalDemandLine[] = [];

  for (const line of demand) {
    const kitComponents = line.kit?.components;
    if (kitComponents?.length) {
      for (const component of kitComponents) {
        out.push({
          productId: component.productId,
          requestedQuantity: component.quantity * line.requestedQuantity,
          isOptional: line.isOptional,
        });
      }
      continue;
    }

    if (line.productId) {
      out.push({
        productId: line.productId,
        requestedQuantity: line.requestedQuantity,
        isOptional: line.isOptional,
      });
      continue;
    }
  }

  return mergePhysicalDemand(out);
}

export function catalogComponentsForProduct(
  productId: Types.ObjectId | string | undefined,
  productMap: Map<string, CatalogProduct>
): IDemandKitComponent[] {
  if (!productId) return [];
  const product = productMap.get(String(productId));
  return (product?.components ?? []).map((c) => ({
    productId: c.productId,
    quantity: c.quantity,
  }));
}

function mergePhysicalDemand(lines: PhysicalDemandLine[]): PhysicalDemandLine[] {
  const map = new Map<string, PhysicalDemandLine>();
  for (const line of lines) {
    const key = `${String(line.productId)}:${line.isOptional ? 'opt' : 'req'}`;
    const existing = map.get(key);
    if (existing) {
      existing.requestedQuantity += line.requestedQuantity;
    } else {
      map.set(key, { ...line });
    }
  }
  return [...map.values()];
}

export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}
