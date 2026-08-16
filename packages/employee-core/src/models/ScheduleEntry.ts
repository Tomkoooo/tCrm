import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ScheduleEntryKind = 'shift' | 'off' | 'training' | 'other' | 'field_work';

export interface IScheduleLocationVisit {
  label: string;
  address?: string;
  start: Date;
  end: Date;
}

/**
 * Generic tag linking a schedule entry back to whatever module/entity created it
 * (e.g. a logistics event assignment) without employee-core knowing that module's schema.
 */
export type ScheduleEntrySourceRef = {
  module: string;
  refType: string;
  refId: Types.ObjectId;
  label?: string;
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
  locations?: IScheduleLocationVisit[];
  sourceRef?: ScheduleEntrySourceRef;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleLocationVisitSchema = new Schema(
  {
    label: { type: String, required: true, maxlength: 200 },
    address: { type: String, maxlength: 500 },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  { _id: false }
);

const ScheduleEntrySourceRefSchema = new Schema(
  {
    module: { type: String, required: true },
    refType: { type: String, required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String },
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
    locations: [ScheduleLocationVisitSchema],
    sourceRef: { type: ScheduleEntrySourceRefSchema },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ScheduleEntrySchema.index({ employeeId: 1, start: 1 });
ScheduleEntrySchema.index({ companyId: 1, start: 1 });
ScheduleEntrySchema.index(
  { 'sourceRef.module': 1, 'sourceRef.refType': 1, 'sourceRef.refId': 1 },
  { sparse: true }
);

export const ScheduleEntry =
  (mongoose.models.ScheduleEntry as mongoose.Model<IScheduleEntry>) ||
  mongoose.model<IScheduleEntry>('ScheduleEntry', ScheduleEntrySchema);
