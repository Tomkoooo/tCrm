import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IUserInvitation extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  token: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys: string[];
  expiresAt: Date;
  isUsed: boolean;
  invitedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserInvitationSchema = new Schema<IUserInvitation>(
  {
    email: { type: String, required: true, index: true },
    name: { type: String, required: true },
    token: { type: String, required: true, unique: true, index: true },
    roleIds: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    directPermissionKeys: [{ type: String }],
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const UserInvitation =
  (mongoose.models.UserInvitation as mongoose.Model<IUserInvitation>) ||
  mongoose.model<IUserInvitation>('UserInvitation', UserInvitationSchema);
