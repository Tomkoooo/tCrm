import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type HrRequestType = 'holiday' | 'sick_leave' | 'schedule_change';
export type HrRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IHrRequestPayload {
  startDate?: Date;
  endDate?: Date;
  reason?: string;
  sickPayAmount?: number;
  scheduleEntryId?: Types.ObjectId;
  proposedStart?: Date;
  proposedEnd?: Date;
  /** Snapshot at submit — HR can compare even if the shift is later edited. */
  originalStart?: Date;
  originalEnd?: Date;
  originalTitle?: string;
}

export interface IHrRequest extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  type: HrRequestType;
  status: HrRequestStatus;
  requestedByUserId: Types.ObjectId;
  reviewedByUserId?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  payload: IHrRequestPayload;
  createdAt: Date;
  updatedAt: Date;
}

const HrRequestSchema = new Schema<IHrRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: {
      type: String,
      enum: ['holiday', 'sick_leave', 'schedule_change'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
    payload: {
      startDate: { type: Date },
      endDate: { type: Date },
      reason: { type: String },
      sickPayAmount: { type: Number },
      scheduleEntryId: { type: Schema.Types.ObjectId, ref: 'ScheduleEntry' },
      proposedStart: { type: Date },
      proposedEnd: { type: Date },
      originalStart: { type: Date },
      originalEnd: { type: Date },
      originalTitle: { type: String },
    },
  },
  { timestamps: true }
);

HrRequestSchema.index({ status: 1, companyId: 1 });
HrRequestSchema.index({ employeeId: 1, status: 1 });

export const HrRequest =
  (mongoose.models.HrRequest as mongoose.Model<IHrRequest>) ||
  mongoose.model<IHrRequest>('HrRequest', HrRequestSchema);
