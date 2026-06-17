import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ScheduleEntryKind = 'shift' | 'off' | 'training' | 'other' | 'field_work';

export type ScheduleEntrySourceRef = {
  type: 'logistics_pickup';
  jobId: Types.ObjectId;
  pickupId: Types.ObjectId;
  leg?: 'gather' | 'event';
};

export interface IScheduleEntry extends Document {
  _id: Types.ObjectId;
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  start: Date;
  end: Date;
  allDay?: boolean;
  kind: ScheduleEntryKind;
  title?: string;
  notes?: string;
  locationLabel?: string;
  locationAddress?: string;
  sourceRef?: ScheduleEntrySourceRef;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleEntrySourceRefSchema = new Schema(
  {
    type: { type: String, enum: ['logistics_pickup'], required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'LogisticsJob', required: true },
    pickupId: { type: Schema.Types.ObjectId, required: true },
    leg: { type: String, enum: ['gather', 'event'] },
  },
  { _id: false }
);

const ScheduleEntrySchema = new Schema<IScheduleEntry>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    kind: {
      type: String,
      enum: ['shift', 'off', 'training', 'other', 'field_work'],
      default: 'shift',
    },
    title: { type: String },
    notes: { type: String },
    locationLabel: { type: String, maxlength: 200 },
    locationAddress: { type: String, maxlength: 500 },
    sourceRef: { type: ScheduleEntrySourceRefSchema },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ScheduleEntrySchema.index({ employeeId: 1, start: 1 });
ScheduleEntrySchema.index({ companyId: 1, start: 1 });
ScheduleEntrySchema.index(
  { 'sourceRef.type': 1, 'sourceRef.jobId': 1, 'sourceRef.pickupId': 1, 'sourceRef.leg': 1 },
  { sparse: true }
);

export const ScheduleEntry =
  (mongoose.models.ScheduleEntry as mongoose.Model<IScheduleEntry>) ||
  mongoose.model<IScheduleEntry>('ScheduleEntry', ScheduleEntrySchema);
