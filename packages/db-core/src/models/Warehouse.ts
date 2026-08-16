import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IWarehouse extends Document {
  _id: Types.ObjectId;
  key: string;
  name: string;
  address?: string;
  /** Staff assigned to this warehouse (pickups, notifications, scoped views). */
  assignedUserIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    address: { type: String },
    assignedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Warehouse =
  (mongoose.models.Warehouse as mongoose.Model<IWarehouse>) ||
  mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
