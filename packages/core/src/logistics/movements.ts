import {
  connectDB,
  StockMovement,
  type IMovementLine,
  type IStockMovement,
  type MovementType,
} from '@crm/db';
import type { ClientSession, Types } from 'mongoose';
import { releaseReservation } from './reservations';
import { generateMovementReference } from './references';
import { applyStockDelta } from './stock-helpers';

export type CreateMovementParams = {
  type: MovementType;
  lines: IMovementLine[];
  fromWarehouseId?: Types.ObjectId;
  toWarehouseId?: Types.ObjectId;
  supplierId?: Types.ObjectId;
  note?: string;
  createdBy: Types.ObjectId;
};

function resolveLineWarehouses(
  line: IMovementLine,
  movement: Pick<IStockMovement, 'type' | 'fromWarehouseId' | 'toWarehouseId'>
): { fromId?: Types.ObjectId; toId?: Types.ObjectId } {
  return {
    fromId: line.fromWarehouseId ?? movement.fromWarehouseId,
    toId: line.toWarehouseId ?? movement.toWarehouseId,
  };
}

async function applyLineConfirm(
  movement: IStockMovement,
  line: IMovementLine,
  userId: Types.ObjectId,
  session?: ClientSession
): Promise<void> {
  const { fromId, toId } = resolveLineWarehouses(line, movement);

  switch (movement.type) {
    case 'grn': {
      if (!toId) throw new Error('GRN requires a destination warehouse');
      await applyStockDelta({
        productId: line.productId,
        warehouseId: toId,
        delta: line.quantity,
        reason: 'grn',
        note: movement.reference,
        userId,
        session,
      });
      break;
    }
    case 'pick': {
      if (!fromId) throw new Error('Pick requires a source warehouse');
      if (line.reservationId) {
        await releaseReservation(line.reservationId, 'fulfilled', userId, session);
      }
      await applyStockDelta({
        productId: line.productId,
        warehouseId: fromId,
        delta: -line.quantity,
        reason: 'pick',
        note: movement.reference,
        userId,
        session,
      });
      break;
    }
    case 'transfer': {
      if (!fromId || !toId) throw new Error('Transfer requires source and destination warehouses');
      if (fromId.equals(toId)) throw new Error('Transfer source and destination must differ');
      await applyStockDelta({
        productId: line.productId,
        warehouseId: fromId,
        delta: -line.quantity,
        reason: 'transfer',
        note: `${movement.reference} (out)`,
        userId,
        session,
      });
      await applyStockDelta({
        productId: line.productId,
        warehouseId: toId,
        delta: line.quantity,
        reason: 'transfer',
        note: `${movement.reference} (in)`,
        userId,
        session,
      });
      break;
    }
    case 'return': {
      if (!toId) throw new Error('Return requires a destination warehouse');
      await applyStockDelta({
        productId: line.productId,
        warehouseId: toId,
        delta: line.quantity,
        reason: 'return',
        note: movement.reference,
        userId,
        session,
      });
      break;
    }
    case 'adjustment': {
      const warehouseId = toId ?? fromId;
      if (!warehouseId) throw new Error('Adjustment requires a warehouse');
      const delta = toId ? line.quantity : -line.quantity;
      await applyStockDelta({
        productId: line.productId,
        warehouseId,
        delta,
        reason: 'correction',
        note: movement.reference,
        userId,
        session,
      });
      break;
    }
    default:
      throw new Error(`Unsupported movement type: ${movement.type}`);
  }
}

export async function createMovement(params: CreateMovementParams): Promise<IStockMovement> {
  await connectDB();

  if (!params.lines.length) {
    throw new Error('Movement must have at least one line');
  }

  const reference = await generateMovementReference(params.type);

  const [movement] = await StockMovement.create([
    {
      type: params.type,
      reference,
      status: 'draft',
      lines: params.lines,
      fromWarehouseId: params.fromWarehouseId,
      toWarehouseId: params.toWarehouseId,
      supplierId: params.supplierId,
      note: params.note,
      createdBy: params.createdBy,
    },
  ]);

  return movement;
}

export async function confirmMovement(
  id: Types.ObjectId,
  userId: Types.ObjectId
): Promise<IStockMovement> {
  await connectDB();

  const movement = await StockMovement.findById(id);
  if (!movement) throw new Error('Movement not found');
  if (movement.status !== 'draft') {
    throw new Error(`Movement is not draft (status: ${movement.status})`);
  }
  if (!movement.lines.length) {
    throw new Error('Movement has no lines');
  }

  for (const line of movement.lines) {
    await applyLineConfirm(movement, line, userId);
  }

  movement.status = 'confirmed';
  movement.confirmedAt = new Date();
  movement.confirmedBy = userId;
  await movement.save();
  return movement;
}

export async function cancelMovement(
  id: Types.ObjectId,
  _userId: Types.ObjectId
): Promise<IStockMovement> {
  await connectDB();

  const movement = await StockMovement.findById(id);
  if (!movement) throw new Error('Movement not found');
  if (movement.status !== 'draft') {
    throw new Error(`Only draft movements can be cancelled (status: ${movement.status})`);
  }

  movement.status = 'cancelled';
  await movement.save();
  return movement;
}

export { generateMovementReference, formatMovementReference } from './references';
