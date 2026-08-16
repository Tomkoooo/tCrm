import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPermission extends Document {
  _id: Types.ObjectId;
  key: string;
  label: string;
  group: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    group: { type: String, required: true, index: true },
    description: { type: String },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Permission =
  (mongoose.models.Permission as mongoose.Model<IPermission>) ||
  mongoose.model<IPermission>('Permission', PermissionSchema);
