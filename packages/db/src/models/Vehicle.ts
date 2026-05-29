import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IVehicle extends Document {
  _id: Types.ObjectId;
  name: string;
  plateNumber: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  maxWeightKg: number;
  maxVolumeM3: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    plateNumber: { type: String, required: true, trim: true, maxlength: 32, index: true },
    lengthMm: { type: Number, required: true, min: 1 },
    widthMm: { type: Number, required: true, min: 1 },
    heightMm: { type: Number, required: true, min: 1 },
    maxWeightKg: { type: Number, required: true, min: 0.001 },
    maxVolumeM3: { type: Number, required: true, min: 0.000001 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

VehicleSchema.index({ isActive: 1, name: 1 });

export const Vehicle =
  (mongoose.models.Vehicle as mongoose.Model<IVehicle>) ||
  mongoose.model<IVehicle>('Vehicle', VehicleSchema);
