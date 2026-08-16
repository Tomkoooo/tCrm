import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IRole extends Document {
  _id: Types.ObjectId;
  key: string;
  name: string;
  description?: string;
  permissionIds: Types.ObjectId[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    permissionIds: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role =
  (mongoose.models.Role as mongoose.Model<IRole>) || mongoose.model<IRole>('Role', RoleSchema);
