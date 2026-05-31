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
  companyId?: Types.ObjectId;
  imageIds: Types.ObjectId[];
  licenseFileId?: Types.ObjectId;
  registrationFileId?: Types.ObjectId;
  insuranceFileId?: Types.ObjectId;
  registrationDueDate?: Date;
  insuranceDueDate?: Date;
  allowedUserIds: Types.ObjectId[];
  allowedRoleIds: Types.ObjectId[];
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
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    imageIds: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
    licenseFileId: { type: Schema.Types.ObjectId, ref: 'Media' },
    registrationFileId: { type: Schema.Types.ObjectId, ref: 'Media' },
    insuranceFileId: { type: Schema.Types.ObjectId, ref: 'Media' },
    registrationDueDate: { type: Date, index: true },
    insuranceDueDate: { type: Date, index: true },
    allowedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    allowedRoleIds: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

VehicleSchema.index({ isActive: 1, name: 1 });

export const Vehicle =
  (mongoose.models.Vehicle as mongoose.Model<IVehicle>) ||
  mongoose.model<IVehicle>('Vehicle', VehicleSchema);
