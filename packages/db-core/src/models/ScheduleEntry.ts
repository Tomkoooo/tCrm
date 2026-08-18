import mongoose, { Schema, type Document, type Types } from 'mongoose';

/** job = logistics sync; off = leave; shift/other = roster HR edits. */
export type ScheduleEntryKind = 'job' | 'off' | 'shift' | 'other';

/**
 * Tag linking a schedule entry back to the module/entity that created it
 * (e.g. a logistics pickup) without HR knowing that module's schema.
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
  kind: ScheduleEntryKind;
  /** Crew role on the logistics job this entry came from. */
  role?: string;
  title?: string;
  notes?: string;
  sourceRef?: ScheduleEntrySourceRef;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleEntrySchema = new Schema<IScheduleEntry>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    kind: {
      type: String,
      enum: ['job', 'off', 'shift', 'other'],
      required: true,
      default: 'job',
      index: true,
    },
    role: { type: String, maxlength: 32, index: true },
    title: { type: String, maxlength: 300 },
    notes: { type: String, maxlength: 2000 },
    sourceRef: { type: Schema.Types.Mixed },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  // Preserve extra fields from main (allDay, locationLabel) and both sourceRef shapes.
  { timestamps: true, strict: false }
);

ScheduleEntrySchema.index({ employeeId: 1, start: 1 });
ScheduleEntrySchema.index({ companyId: 1, start: 1 });
ScheduleEntrySchema.index({ kind: 1, start: 1 });
ScheduleEntrySchema.index(
  { 'sourceRef.module': 1, 'sourceRef.refType': 1, 'sourceRef.refId': 1 },
  { sparse: true }
);

export const ScheduleEntry =
  (mongoose.models.ScheduleEntry as mongoose.Model<IScheduleEntry>) ||
  mongoose.model<IScheduleEntry>('ScheduleEntry', ScheduleEntrySchema);
