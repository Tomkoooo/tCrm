import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ReservationSourceType = 'order' | 'build' | 'manual';
export type ReservationStatus = 'active' | 'released' | 'fulfilled' | 'cancelled';

export interface IReservation extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  quantity: number;
  sourceType: ReservationSourceType;
  sourceId?: Types.ObjectId;
  sourceRef?: string;
  status: ReservationStatus;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  releasedAt?: Date;
  releasedBy?: Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    sourceType: {
      type: String,
      required: true,
      enum: ['order', 'build', 'manual'],
    },
    sourceId: { type: Schema.Types.ObjectId },
    sourceRef: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['active', 'released', 'fulfilled', 'cancelled'],
      default: 'active',
      index: true,
    },
    expiresAt: { type: Date, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    releasedAt: { type: Date },
    releasedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { timestamps: true }
);

ReservationSchema.index({ productId: 1, warehouseId: 1, status: 1 });
ReservationSchema.index({ sourceType: 1, sourceId: 1 });
ReservationSchema.index({ status: 1, expiresAt: 1 });

export const Reservation =
  (mongoose.models.Reservation as mongoose.Model<IReservation>) ||
  mongoose.model<IReservation>('Reservation', ReservationSchema);
