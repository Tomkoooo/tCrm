import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type VehicleBookingStatus = 'held' | 'confirmed' | 'cancelled';
export type VehicleLastKnownPlace = 'unknown' | 'warehouse' | 'site';

export interface IVehicleBooking extends Document {
  _id: Types.ObjectId;
  vehicleId: Types.ObjectId;
  jobId: Types.ObjectId;
  pickupId?: Types.ObjectId;
  start: Date;
  end: Date;
  status: VehicleBookingStatus;
  lastKnownPlace: VehicleLastKnownPlace;
  lastKnownWarehouseId?: Types.ObjectId;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleBookingSchema = new Schema<IVehicleBooking>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'LogisticsJob', required: true, index: true },
    pickupId: { type: Schema.Types.ObjectId },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['held', 'confirmed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    lastKnownPlace: {
      type: String,
      required: true,
      enum: ['unknown', 'warehouse', 'site'],
      default: 'unknown',
    },
    lastKnownWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    note: { type: String, maxlength: 2000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

VehicleBookingSchema.index({ vehicleId: 1, start: 1, end: 1, status: 1 });
VehicleBookingSchema.index({ jobId: 1, status: 1 });

export const VehicleBooking =
  (mongoose.models.VehicleBooking as mongoose.Model<IVehicleBooking>) ||
  mongoose.model<IVehicleBooking>('VehicleBooking', VehicleBookingSchema);
