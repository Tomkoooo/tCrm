import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ScheduleChangeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IScheduleChangeRequest extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  scheduleEntryId: Types.ObjectId;
  status: ScheduleChangeStatus;
  originalStart: Date;
  originalEnd: Date;
  proposedStart: Date;
  proposedEnd: Date;
  note?: string;
  requestedBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleChangeRequestSchema = new Schema<IScheduleChangeRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    scheduleEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'ScheduleEntry',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      required: true,
      default: 'pending',
      index: true,
    },
    originalStart: { type: Date, required: true },
    originalEnd: { type: Date, required: true },
    proposedStart: { type: Date, required: true },
    proposedEnd: { type: Date, required: true },
    note: { type: String, maxlength: 2000 },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const ScheduleChangeRequest =
  (mongoose.models.ScheduleChangeRequest as mongoose.Model<IScheduleChangeRequest>) ||
  mongoose.model<IScheduleChangeRequest>('ScheduleChangeRequest', ScheduleChangeRequestSchema);
