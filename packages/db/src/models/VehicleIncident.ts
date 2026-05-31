import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type VehicleIncidentStatus = 'reported' | 'fixed';

export interface IVehicleIncident extends Document {
  _id: Types.ObjectId;
  vehicleId: Types.ObjectId;
  reportedById: Types.ObjectId;
  description: string;
  photoIds: Types.ObjectId[];
  status: VehicleIncidentStatus;
  fixedAt?: Date;
  fixedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleIncidentSchema = new Schema<IVehicleIncident>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    reportedById: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    photoIds: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
    status: {
      type: String,
      enum: ['reported', 'fixed'],
      default: 'reported',
      index: true,
    },
    fixedAt: { type: Date },
    fixedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

VehicleIncidentSchema.index({ vehicleId: 1, status: 1, createdAt: -1 });

export const VehicleIncident =
  (mongoose.models.VehicleIncident as mongoose.Model<IVehicleIncident>) ||
  mongoose.model<IVehicleIncident>('VehicleIncident', VehicleIncidentSchema);
