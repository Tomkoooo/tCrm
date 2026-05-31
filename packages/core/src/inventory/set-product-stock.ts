import mongoose, { type ClientSession, type Types } from 'mongoose';
import { connectDB, StockAdjustment, StockLevel } from '@crm/db';
import { syncProductWarehouseIds } from './sync-warehouse-ids';
import type { BulkUpdateScope } from './bulk-update';

function assertWarehouseAllowed(warehouseId: Types.ObjectId, scope: BulkUpdateScope): void {
  if (scope.isGlobal) return;
  const allowed = scope.allowedWarehouseIds.some((id) => id.equals(warehouseId));
  if (!allowed) {
    throw new Error('Nincs jogosultság ehhez a raktárhoz.');
  }
}

export type SetProductStockLevelOptions = {
  note?: string;
  reason?: 'physical_count' | 'correction';
  session?: ClientSession;
};

/** Set absolute on-hand quantity for one product in one warehouse. */
export async function setProductStockLevel(
  productId: Types.ObjectId,
  warehouseId: Types.ObjectId,
  targetQty: number,
  userId: string,
  scope: BulkUpdateScope,
  opts?: SetProductStockLevelOptions
): Promise<{ delta: number }> {
  await connectDB();

  if (targetQty < 0) {
    throw new Error('A készlet nem lehet negatív.');
  }

  assertWarehouseAllowed(warehouseId, scope);

  const userOid = new mongoose.Types.ObjectId(userId);
  const session = opts?.session ?? null;

  const existing = await StockLevel.findOne({ productId, warehouseId })
    .session(session)
    .lean()
    .exec();
  const previous = existing?.onHand ?? 0;
  const delta = targetQty - previous;

  await StockLevel.findOneAndUpdate(
    { productId, warehouseId },
    {
      $set: {
        onHand: targetQty,
        lastChangedAt: new Date(),
        lastChangedBy: userOid,
      },
    },
    { upsert: true, new: true, session }
  ).exec();

  if (delta !== 0) {
    await StockAdjustment.create(
      [
        {
          productId,
          warehouseId,
          delta,
          reason: opts?.reason ?? 'physical_count',
          note: opts?.note ?? 'Kézi módosítás',
          byUserId: userOid,
          at: new Date(),
        },
      ],
      { session }
    );
  }

  await syncProductWarehouseIds(productId, opts?.session);

  return { delta };
}
