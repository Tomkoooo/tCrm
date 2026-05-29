import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type SecretValueFormat = 'single' | 'multiline';

export interface ISecretItem {
  _id: Types.ObjectId;
  key: string;
  /** AES-256-GCM ciphertext: salt:iv:authTag:hex */
  value: string;
  /** single = one-line (passwords); multiline = textarea (bank, company blocks) */
  valueFormat?: SecretValueFormat;
  description?: string;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

export interface ISecretProject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  secrets: ISecretItem[];
  allowedRoles: Types.ObjectId[];
  allowedUsers: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SecretItemSchema = new Schema<ISecretItem>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true },
    valueFormat: { type: String, enum: ['single', 'multiline'], default: 'single' },
    description: { type: String, trim: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const SecretProjectSchema = new Schema<ISecretProject>(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    secrets: { type: [SecretItemSchema], default: [] },
    allowedRoles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

SecretProjectSchema.index({ name: 1, createdBy: 1 });

export const SecretProject =
  (mongoose.models.SecretProject as mongoose.Model<ISecretProject>) ||
  mongoose.model<ISecretProject>('SecretProject', SecretProjectSchema);
