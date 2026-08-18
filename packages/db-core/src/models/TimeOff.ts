import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type TimeOffType = 'leave' | 'sick';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ITimeOff extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  type: TimeOffType;
  status: TimeOffStatus;
  start: Date;
  end: Date;
  note?: string;
  requestedBy?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TimeOffSchema = new Schema<ITimeOff>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: { type: String, enum: ['leave', 'sick'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      required: true,
      default: 'pending',
      index: true,
    },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    note: { type: String, maxlength: 2000 },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

TimeOffSchema.index({ employeeId: 1, start: 1, end: 1 });
TimeOffSchema.index({ status: 1, start: 1 });

export const TimeOff =
  (mongoose.models.TimeOff as mongoose.Model<ITimeOff>) ||
  mongoose.model<ITimeOff>('TimeOff', TimeOffSchema);
