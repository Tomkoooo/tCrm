import { connectDB, Product } from '@crm/db';
import type { Types } from 'mongoose';

export type PickupBomComponent = {
  productId: string;
  sku: string;
  name: string;
  /** Per one unit of the immediate parent assembly */
  quantityPerKit: number;
  /** quantityPerKit × parent line quantity (through the chain) */
  totalQuantity: number;
  /** Nesting depth under the pickup line (0 = direct child). */
  depth: number;
  /** True when this row is a sub-assembly with its own BOM. */
  isAssembly: boolean;
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

type ProductBomLean = {
  _id: Types.ObjectId;
  sku: string;
  names?: { hu?: string; en?: string };
  components?: Array<{ productId: Types.ObjectId; quantity: number }>;
};

function displayName(p: { sku: string; names?: { hu?: string; en?: string } }): string {
  return p.names?.hu ?? p.names?.en ?? p.sku;
}

async function loadProductBomGraph(
  rootIds: Types.ObjectId[]
): Promise<Map<string, ProductBomLean>> {
  const map = new Map<string, ProductBomLean>();
  const queue = rootIds.map((id) => String(id));
  const seen = new Set<string>();

  while (queue.length > 0) {
    const batchIds = queue.splice(0, 100).filter((id) => !seen.has(id));
    if (!batchIds.length) continue;
    for (const id of batchIds) seen.add(id);

    const docs = await Product.find({ _id: { $in: batchIds } })
      .select({ sku: 1, names: 1, components: 1 })
      .lean()
      .exec();

    for (const doc of docs) {
      const id = String(doc._id);
      map.set(id, doc as ProductBomLean);
      for (const component of doc.components ?? []) {
        const componentId = String(component.productId);
        if (!seen.has(componentId)) queue.push(componentId);
      }
    }
  }

  return map;
}

function expandBomRecursive(
  productId: string,
  productMap: Map<string, ProductBomLean>,
  parentQuantity: number,
  depth: number,
  visited: Set<string>
): PickupBomComponent[] {
  const product = productMap.get(productId);
  const components = product?.components ?? [];
  if (!components.length) return [];

  const rows: PickupBomComponent[] = [];

  for (const component of components) {
    const componentId = String(component.productId);
    if (visited.has(componentId)) continue;

    const compProduct = productMap.get(componentId);
    const perParent = component.quantity;
    const totalQuantity = perParent * parentQuantity;
    const childComponents = compProduct?.components ?? [];
    const isAssembly = childComponents.length > 0;

    rows.push({
      productId: componentId,
      sku: compProduct?.sku ?? '—',
      name: compProduct ? displayName(compProduct) : '—',
      quantityPerKit: perParent,
      totalQuantity,
      depth,
      isAssembly,
    });

    if (isAssembly) {
      const nextVisited = new Set(visited);
      nextVisited.add(componentId);
      rows.push(
        ...expandBomRecursive(componentId, productMap, totalQuantity, depth + 1, nextVisited)
      );
    }
  }

  return rows;
}

/**
 * Enrich pickup lines with recursive BOM component breakdown for prebuilds.
 */
export async function enrichPickupLinesDisplay(
  lines: PickupLineQuantityInput[]
): Promise<PickupLineDisplayItem[]> {
  await connectDB();

  if (!lines.length) return [];

  const parentIds = lines.map((line) => line.productId);
  const productMap = await loadProductBomGraph(parentIds);

  return lines.map((line) => {
    const parent = productMap.get(String(line.productId));
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

    const directComponents = parent.components ?? [];
    const isPrebuild = directComponents.length > 0;
    const bomComponents = isPrebuild
      ? expandBomRecursive(String(line.productId), productMap, line.quantity, 0, new Set())
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
