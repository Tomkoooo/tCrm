import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IMonthlyWorkSummary extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  year: number;
  month: number;
  workedHours: number;
  holidayDays: number;
  sickDays: number;
  sickPayAmount?: number;
  notes?: string;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyWorkSummarySchema = new Schema<IMonthlyWorkSummary>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    workedHours: { type: Number, default: 0 },
    holidayDays: { type: Number, default: 0 },
    sickDays: { type: Number, default: 0 },
    sickPayAmount: { type: Number },
    notes: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MonthlyWorkSummarySchema.index({ employeeId: 1, year: 1, month: 1 }, { unique: true });
MonthlyWorkSummarySchema.index({ companyId: 1, year: 1, month: 1 });

export const MonthlyWorkSummary =
  (mongoose.models.MonthlyWorkSummary as mongoose.Model<IMonthlyWorkSummary>) ||
  mongoose.model<IMonthlyWorkSummary>('MonthlyWorkSummary', MonthlyWorkSummarySchema);
