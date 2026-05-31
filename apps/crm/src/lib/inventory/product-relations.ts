import type { Types } from 'mongoose';
import { StockLevel } from '@crm/db';
import { resolveProductThumbnailUrl } from '@/lib/product-thumbnail';
import { formatProductStockSummary, warehouseDisplayLabel } from './product-table-columns';

export type ProductRelationCardData = {
  sku: string;
  name: string;
  thumbnailUrl?: string;
  stockSummary?: string;
};

export type ProductRelationsData = {
  center: ProductRelationCardData;
  parents: Array<ProductRelationCardData & { quantity: number }>;
  components: Array<ProductRelationCardData & { quantity: number; available?: number }>;
  canBuild?: number;
};

type ProductLeanForRelation = {
  _id: Types.ObjectId;
  sku: string;
  names?: { hu?: string; en?: string; de?: string };
  imageIds?: Array<{ toString(): string } | string>;
  externalImageHints?: string[];
};

export function productDisplayName(p: ProductLeanForRelation): string {
  return p.names?.hu ?? p.names?.en ?? p.names?.de ?? p.sku;
}

export async function buildStockSummariesForProducts(
  productIds: Types.ObjectId[],
  warehouseNameById: Map<string, string>,
  scopeWarehouseIds?: string[]
): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();

  const filter: Record<string, unknown> = {
    productId: { $in: productIds },
    onHand: { $gt: 0 },
  };
  if (scopeWarehouseIds?.length) {
    filter.warehouseId = { $in: scopeWarehouseIds };
  }

  const levels = await StockLevel.find(filter)
    .select({ productId: 1, warehouseId: 1, onHand: 1 })
    .lean()
    .exec();

  const byProduct = new Map<string, Array<{ warehouseName: string; onHand: number }>>();
  for (const level of levels) {
    const warehouseName = warehouseNameById.get(String(level.warehouseId));
    if (!warehouseName) continue;
    const productId = String(level.productId);
    const list = byProduct.get(productId) ?? [];
    list.push({ warehouseName, onHand: level.onHand ?? 0 });
    byProduct.set(productId, list);
  }

  const result = new Map<string, string>();
  for (const [productId, entries] of byProduct) {
    entries.sort((a, b) =>
      warehouseDisplayLabel(a.warehouseName).localeCompare(
        warehouseDisplayLabel(b.warehouseName),
        'hu'
      )
    );
    const summary = formatProductStockSummary(entries);
    if (summary) result.set(productId, summary);
  }
  return result;
}

export function toRelationCard(
  p: ProductLeanForRelation,
  stockSummaries: Map<string, string>
): ProductRelationCardData {
  return {
    sku: p.sku,
    name: productDisplayName(p),
    thumbnailUrl: resolveProductThumbnailUrl(p),
    stockSummary: stockSummaries.get(String(p._id)),
  };
}
