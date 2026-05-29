import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ScheduleEntryKind = 'shift' | 'off' | 'training' | 'other';

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
    allDay: { type: Boolean, default: false },
    kind: {
      type: String,
      enum: ['shift', 'off', 'training', 'other'],
      default: 'shift',
    },
    title: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ScheduleEntrySchema.index({ employeeId: 1, start: 1 });
ScheduleEntrySchema.index({ companyId: 1, start: 1 });

export const ScheduleEntry =
  (mongoose.models.ScheduleEntry as mongoose.Model<IScheduleEntry>) ||
  mongoose.model<IScheduleEntry>('ScheduleEntry', ScheduleEntrySchema);
