import {
  connectDB,
  VehicleBooking,
  type IVehicleBooking,
  type VehicleLastKnownPlace,
} from '@crm/db-core';
import type { Types } from 'mongoose';
import { rangesOverlap } from '@crm/hr';

export type CreateVehicleBookingParams = {
  vehicleId: Types.ObjectId;
  jobId: Types.ObjectId;
  pickupId?: Types.ObjectId;
  start: Date;
  end: Date;
  lastKnownPlace?: VehicleLastKnownPlace;
  lastKnownWarehouseId?: Types.ObjectId;
  note?: string;
  createdBy: Types.ObjectId;
};

export async function listOverlappingVehicleBookings(
  vehicleId: Types.ObjectId,
  start: Date,
  end: Date,
  ignoreJobId?: Types.ObjectId
): Promise<IVehicleBooking[]> {
  await connectDB();
  const filter: Record<string, unknown> = {
    vehicleId,
    status: { $in: ['held', 'confirmed'] },
    start: { $lt: end },
    end: { $gt: start },
  };
  if (ignoreJobId) filter.jobId = { $ne: ignoreJobId };
  return VehicleBooking.find(filter).exec();
}

export async function isVehicleBooked(
  vehicleId: Types.ObjectId,
  start: Date,
  end: Date,
  ignoreJobId?: Types.ObjectId
): Promise<boolean> {
  const rows = await listOverlappingVehicleBookings(vehicleId, start, end, ignoreJobId);
  return rows.some((b) => rangesOverlap(b.start, b.end, start, end));
}

export async function createVehicleBooking(
  params: CreateVehicleBookingParams
): Promise<IVehicleBooking> {
  await connectDB();
  const [row] = await VehicleBooking.create([
    {
      vehicleId: params.vehicleId,
      jobId: params.jobId,
      pickupId: params.pickupId,
      start: params.start,
      end: params.end,
      status: 'confirmed',
      lastKnownPlace: params.lastKnownPlace ?? 'warehouse',
      lastKnownWarehouseId: params.lastKnownWarehouseId,
      note: params.note,
      createdBy: params.createdBy,
    },
  ]);
  return row;
}

export async function cancelVehicleBookingsForJob(jobId: Types.ObjectId): Promise<number> {
  await connectDB();
  const result = await VehicleBooking.updateMany(
    { jobId, status: { $in: ['held', 'confirmed'] } },
    { $set: { status: 'cancelled' } }
  ).exec();
  return result.modifiedCount ?? 0;
}

export async function listBookingsForJob(jobId: Types.ObjectId): Promise<IVehicleBooking[]> {
  await connectDB();
  return VehicleBooking.find({ jobId, status: { $in: ['held', 'confirmed'] } }).exec();
}
