import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash?: string;
  emailVerified?: Date;
  image?: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys: string[];
  isActive: boolean;
  resetToken?: string;
  resetTokenExpires?: Date;
  employeeOnboardingCompletedAt?: Date;
  /** Active HR membership (Employee._id) for self-service — no cookie. */
  activeEmployeeId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String },
    emailVerified: { type: Date },
    image: { type: String },
    roleIds: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    directPermissionKeys: [{ type: String }],
    isActive: { type: Boolean, default: true },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    employeeOnboardingCompletedAt: { type: Date },
    activeEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', sparse: true },
  },
  // Preserve extra fields from the main-branch user profile (lastLoginAt, defaultCompanyId, …).
  { timestamps: true, strict: false }
);

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
