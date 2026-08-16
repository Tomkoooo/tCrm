import { connectDB, Reservation, type IReservation, type ReservationStatus } from '@crm/db';
import type { ClientSession, Types } from 'mongoose';
import { applyStockDelta, availableQty, getOrCreateStockLevel } from './stock-helpers';

export type CreateReservationParams = {
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  quantity: number;
  sourceType: 'order' | 'build' | 'manual';
  sourceId?: Types.ObjectId;
  sourceRef?: string;
  expiresAt?: Date;
  note?: string;
  createdBy: Types.ObjectId;
};

export async function createReservation(params: CreateReservationParams): Promise<IReservation> {
  await connectDB();

  const level = await getOrCreateStockLevel(params.productId, params.warehouseId);
  const avail = availableQty(level);
  if (params.quantity > avail) {
    throw new Error(`Cannot reserve ${params.quantity}: only ${avail} available`);
  }

  const [reservation] = await Reservation.create([
    {
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.quantity,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      sourceRef: params.sourceRef,
      status: 'active' as ReservationStatus,
      expiresAt: params.expiresAt,
      note: params.note,
      createdBy: params.createdBy,
    },
  ]);

  await applyStockDelta({
    productId: params.productId,
    warehouseId: params.warehouseId,
    delta: 0,
    reservedDelta: params.quantity,
    reason: 'reservation',
    note: params.sourceRef ? `Reservation ${params.sourceRef}` : 'Stock reservation',
    userId: params.createdBy,
  });

  return reservation;
}

export async function releaseReservation(
  id: Types.ObjectId,
  reason: 'fulfilled' | 'cancelled',
  userId: Types.ObjectId,
  session?: ClientSession
): Promise<IReservation> {
  await connectDB();

  const reservation = await Reservation.findById(id).session(session ?? null);
  if (!reservation) {
    throw new Error('Reservation not found');
  }
  if (reservation.status !== 'active') {
    throw new Error(`Reservation is not active (status: ${reservation.status})`);
  }

  const status: ReservationStatus = reason === 'fulfilled' ? 'fulfilled' : 'cancelled';
  reservation.status = status;
  reservation.releasedAt = new Date();
  reservation.releasedBy = userId;
  await reservation.save({ session });

  await applyStockDelta({
    productId: reservation.productId,
    warehouseId: reservation.warehouseId,
    delta: 0,
    reservedDelta: -reservation.quantity,
    reason: 'reservation',
    note: `Reservation ${reason}`,
    userId,
    session,
  });

  return reservation;
}

export async function getActiveReservations(
  productId: Types.ObjectId,
  warehouseId?: Types.ObjectId
): Promise<IReservation[]> {
  await connectDB();
  const filter: Record<string, unknown> = { productId, status: 'active' };
  if (warehouseId) filter.warehouseId = warehouseId;
  return Reservation.find(filter).sort({ createdAt: -1 }).exec();
}

export async function cleanupExpiredReservations(): Promise<number> {
  await connectDB();
  const now = new Date();
  const expired = await Reservation.find({
    status: 'active',
    expiresAt: { $lte: now },
  }).exec();

  let count = 0;
  for (const r of expired) {
    await releaseReservation(r._id, 'cancelled', r.createdBy);
    count += 1;
  }
  return count;
}
