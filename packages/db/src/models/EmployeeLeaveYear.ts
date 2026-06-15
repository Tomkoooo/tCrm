import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IEmployeeLeaveYear extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  year: number;
  entitlementDays: number;
  notes?: string;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeLeaveYearSchema = new Schema<IEmployeeLeaveYear>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    year: { type: Number, required: true, min: 2000, max: 2100 },
    entitlementDays: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

EmployeeLeaveYearSchema.index({ employeeId: 1, year: 1 }, { unique: true });
EmployeeLeaveYearSchema.index({ companyId: 1, year: 1 });

export const EmployeeLeaveYear =
  (mongoose.models.EmployeeLeaveYear as mongoose.Model<IEmployeeLeaveYear>) ||
  mongoose.model<IEmployeeLeaveYear>('EmployeeLeaveYear', EmployeeLeaveYearSchema);
