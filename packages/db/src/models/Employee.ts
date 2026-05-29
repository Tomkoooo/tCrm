import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type EmploymentType = 'employee' | 'guest';

export interface IEmployee extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  email?: string;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  userId?: Types.ObjectId;
  employmentType: EmploymentType;
  isActive: boolean;
  hrNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    employeeNumber: { type: String },
    department: { type: String },
    phone: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, unique: true },
    employmentType: {
      type: String,
      enum: ['employee', 'guest'],
      default: 'guest',
    },
    isActive: { type: Boolean, default: true },
    hrNotes: { type: String },
  },
  { timestamps: true }
);

export const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployee>) ||
  mongoose.model<IEmployee>('Employee', EmployeeSchema);
