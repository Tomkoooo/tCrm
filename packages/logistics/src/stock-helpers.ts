import {
  StockAdjustment,
  StockLevel,
  type StockAdjustmentReason,
  type IStockLevel,
} from '@crm/db-core';
import type { ClientSession, Types } from 'mongoose';
import { syncProductWarehouseIds } from '@crm/inventory';

export function availableQty(level: Pick<IStockLevel, 'onHand' | 'reserved'>): number {
  return Math.max(0, level.onHand - level.reserved);
}

export async function getOrCreateStockLevel(
  productId: Types.ObjectId,
  warehouseId: Types.ObjectId,
  session?: ClientSession
): Promise<IStockLevel> {
  const existing = await StockLevel.findOne({ productId, warehouseId }).session(session ?? null);
  if (existing) return existing;

  const [created] = await StockLevel.create([{ productId, warehouseId, onHand: 0, reserved: 0 }], {
    session,
  });
  return created;
}

export async function applyStockDelta(params: {
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  delta: number;
  reservedDelta?: number;
  reason: StockAdjustmentReason;
  note?: string;
  userId: Types.ObjectId;
  session?: ClientSession;
}): Promise<IStockLevel> {
  const {
    productId,
    warehouseId,
    delta,
    reservedDelta = 0,
    reason,
    note,
    userId,
    session,
  } = params;

  const level = await getOrCreateStockLevel(productId, warehouseId, session);

  const nextOnHand = level.onHand + delta;
  const nextReserved = level.reserved + reservedDelta;

  if (nextOnHand < 0) {
    throw new Error('Insufficient on-hand stock');
  }
  if (nextReserved < 0) {
    throw new Error('Reserved quantity cannot be negative');
  }
  if (nextReserved > nextOnHand) {
    throw new Error('Reserved quantity cannot exceed on-hand stock');
  }

  level.onHand = nextOnHand;
  level.reserved = nextReserved;
  level.lastChangedAt = new Date();
  level.lastChangedBy = userId;
  await level.save({ session });

  if (delta !== 0) {
    await StockAdjustment.create(
      [
        {
          productId,
          warehouseId,
          delta,
          reason,
          note,
          byUserId: userId,
          at: new Date(),
        },
      ],
      { session }
    );
  }

  await syncProductWarehouseIds(productId, session);

  return level;
}
