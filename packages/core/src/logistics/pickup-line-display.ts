import { connectDB, Product } from '@crm/db';
import type { Types } from 'mongoose';

export type PickupBomComponent = {
  productId: string;
  sku: string;
  name: string;
  /** Per one unit of the prebuild kit */
  quantityPerKit: number;
  /** quantityPerKit × parent line quantity */
  totalQuantity: number;
};

export type PickupLineDisplayItem = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  isPrebuild: boolean;
  bomComponents: PickupBomComponent[];
};

export type PickupLineQuantityInput = {
  productId: Types.ObjectId;
  quantity: number;
};

function displayName(p: { sku: string; names?: { hu?: string; en?: string } }): string {
  return p.names?.hu ?? p.names?.en ?? p.sku;
}

/**
 * Enrich pickup lines with BOM component breakdown for prebuilds (products with components[]).
 */
export async function enrichPickupLinesDisplay(
  lines: PickupLineQuantityInput[]
): Promise<PickupLineDisplayItem[]> {
  await connectDB();

  if (!lines.length) return [];

  const parentIds = lines.map((l) => l.productId);
  const parents = await Product.find({ _id: { $in: parentIds } })
    .select({ sku: 1, names: 1, components: 1 })
    .lean()
    .exec();

  const parentMap = new Map(parents.map((p) => [String(p._id), p]));

  const componentIds = new Set<string>();
  for (const p of parents) {
    for (const c of p.components ?? []) {
      componentIds.add(String(c.productId));
    }
  }

  const componentProducts =
    componentIds.size > 0
      ? await Product.find({ _id: { $in: [...componentIds] } })
          .select({ sku: 1, names: 1 })
          .lean()
          .exec()
      : [];
  const componentMap = new Map(componentProducts.map((p) => [String(p._id), p]));

  return lines.map((line) => {
    const parent = parentMap.get(String(line.productId));
    if (!parent) {
      return {
        productId: String(line.productId),
        sku: '—',
        name: '—',
        quantity: line.quantity,
        isPrebuild: false,
        bomComponents: [],
      };
    }

    const components = parent.components ?? [];
    const isPrebuild = components.length > 0;
    const bomComponents: PickupBomComponent[] = isPrebuild
      ? components.map((c) => {
          const comp = componentMap.get(String(c.productId));
          const perKit = c.quantity;
          return {
            productId: String(c.productId),
            sku: comp?.sku ?? '—',
            name: comp ? displayName(comp) : '—',
            quantityPerKit: perKit,
            totalQuantity: perKit * line.quantity,
          };
        })
      : [];

    return {
      productId: String(line.productId),
      sku: parent.sku,
      name: displayName(parent),
      quantity: line.quantity,
      isPrebuild,
      bomComponents,
    };
  });
}
