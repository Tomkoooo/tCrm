import { type Types } from 'mongoose';
import { connectDB, Category, Product, StockLevel, Supplier, Warehouse } from '@crm/db';
import { setProductStockLevel } from './set-product-stock';

export type BulkStockMode = 'set' | 'add';

export type BulkProductOperation =
  | { type: 'assignSupplier'; supplierKey: string }
  | { type: 'setStock'; warehouseKey: string; quantity: number; mode: BulkStockMode }
  | { type: 'setActive'; isActive: boolean }
  | { type: 'assignCategory'; categorySlug: string }
  | { type: 'setBrand'; brand: string };

export type BulkUpdateScope = {
  /** Warehouse ObjectIds the user may touch (empty = none for scoped users). */
  allowedWarehouseIds: Types.ObjectId[];
  isGlobal: boolean;
};

export type BulkUpdateResult = {
  matched: number;
  updated: number;
  stockLevelsTouched?: number;
};

async function resolveWarehouseIdsByKeys(keys: string[]): Promise<Map<string, Types.ObjectId>> {
  const normalized = [...new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  const docs = await Warehouse.find({ key: { $in: normalized } })
    .select({ key: 1 })
    .lean()
    .exec();
  return new Map(docs.map((w) => [w.key, w._id as Types.ObjectId]));
}

function assertWarehouseAllowed(warehouseId: Types.ObjectId, scope: BulkUpdateScope): void {
  if (scope.isGlobal) return;
  const allowed = scope.allowedWarehouseIds.some((id) => id.equals(warehouseId));
  if (!allowed) {
    throw new Error('Nincs jogosultság ehhez a raktárhoz.');
  }
}

export async function applyBulkProductOperation(
  listFilter: Record<string, unknown>,
  operation: BulkProductOperation,
  userId: string,
  scope: BulkUpdateScope
): Promise<BulkUpdateResult> {
  await connectDB();

  const matched = await Product.countDocuments(listFilter).exec();
  if (matched === 0) {
    return { matched: 0, updated: 0, stockLevelsTouched: 0 };
  }

  switch (operation.type) {
    case 'assignSupplier': {
      const supplier = await Supplier.findOne({ key: operation.supplierKey }).lean().exec();
      if (!supplier) throw new Error(`Ismeretlen beszállító: ${operation.supplierKey}`);
      const result = await Product.updateMany(listFilter, {
        $set: { supplierId: supplier._id },
      }).exec();
      return { matched, updated: result.modifiedCount };
    }

    case 'setBrand': {
      const result = await Product.updateMany(listFilter, {
        $set: { brand: operation.brand.trim() || undefined },
      }).exec();
      return { matched, updated: result.modifiedCount };
    }

    case 'setActive': {
      const result = await Product.updateMany(listFilter, {
        $set: { isActive: operation.isActive },
      }).exec();
      return { matched, updated: result.modifiedCount };
    }

    case 'assignCategory': {
      const cat = await Category.findOne({ slug: operation.categorySlug })
        .select('_id')
        .lean()
        .exec();
      if (!cat) throw new Error(`Ismeretlen kategória: ${operation.categorySlug}`);
      const result = await Product.updateMany(listFilter, {
        $set: { categoryIds: [cat._id] },
      }).exec();
      return { matched, updated: result.modifiedCount };
    }

    case 'setStock': {
      const keyToId = await resolveWarehouseIdsByKeys([operation.warehouseKey]);
      const warehouseId = keyToId.get(operation.warehouseKey.trim().toLowerCase());
      if (!warehouseId) throw new Error(`Ismeretlen raktár: ${operation.warehouseKey}`);
      assertWarehouseAllowed(warehouseId, scope);

      const products = await Product.find(listFilter).select({ _id: 1 }).lean().exec();
      let stockLevelsTouched = 0;
      let updated = 0;

      for (const p of products) {
        const productId = p._id as Types.ObjectId;
        const existing = await StockLevel.findOne({ productId, warehouseId }).lean().exec();
        const previous = existing?.onHand ?? 0;
        const target =
          operation.mode === 'set' ? operation.quantity : previous + operation.quantity;

        await setProductStockLevel(productId, warehouseId, target, userId, scope, {
          note: 'Tömeges módosítás',
          reason: operation.mode === 'set' ? 'physical_count' : 'correction',
        });

        stockLevelsTouched++;
        updated++;
      }

      return { matched, updated, stockLevelsTouched };
    }

    default:
      throw new Error('Ismeretlen művelet.');
  }
}
