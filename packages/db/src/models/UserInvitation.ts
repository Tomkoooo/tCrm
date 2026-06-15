import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type UserInvitationKind = 'new_user' | 'company_join';

export interface IUserInvitation extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  token: string;
  kind: UserInvitationKind;
  roleIds: Types.ObjectId[];
  directPermissionKeys: string[];
  companyId?: Types.ObjectId;
  isEmployee: boolean;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  hrNotes?: string;
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
    kind: {
      type: String,
      enum: ['new_user', 'company_join'],
      default: 'new_user',
    },
    roleIds: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    directPermissionKeys: [{ type: String }],
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    isEmployee: { type: Boolean, default: false },
    employeeNumber: { type: String },
    department: { type: String },
    phone: { type: String },
    hrNotes: { type: String },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const UserInvitation =
  (mongoose.models.UserInvitation as mongoose.Model<IUserInvitation>) ||
  mongoose.model<IUserInvitation>('UserInvitation', UserInvitationSchema);
