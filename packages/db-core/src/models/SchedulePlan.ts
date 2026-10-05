import mongoose, { Schema, type Document, type Types } from 'mongoose';

/** draft = editable, not visible to employees; published = sent out, employees notified. */
export type SchedulePlanStatus = 'draft' | 'published';

/** Free-text day header notes — the Excel roster's event columns ("Atlétika Épül"). */
export type SchedulePlanDayNote = {
  /** UTC midnight of the day this note belongs to. */
  date: Date;
  notes: string[];
};

export interface ISchedulePlan extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  title: string;
  /** UTC midnight of the first day (inclusive). */
  startDate: Date;
  /** UTC midnight of the last day (inclusive). */
  endDate: Date;
  status: SchedulePlanStatus;
  /** Column order in the planner grid. */
  employeeIds: Types.ObjectId[];
  dayNotes: SchedulePlanDayNote[];
  /** Default shift length applied to new cells, in minutes. */
  defaultShiftMinutes: number;
  notes?: string;
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
  /** Bumped on every publish so re-sends can be labelled "módosult beosztás". */
  publishCount: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SchedulePlanDayNoteSchema = new Schema<SchedulePlanDayNote>(
  {
    date: { type: Date, required: true },
    notes: [{ type: String, maxlength: 300 }],
  },
  { _id: false }
);

const SchedulePlanSchema = new Schema<ISchedulePlan>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'published'],
      required: true,
      default: 'draft',
      index: true,
    },
    employeeIds: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    dayNotes: { type: [SchedulePlanDayNoteSchema], default: [] },
    defaultShiftMinutes: { type: Number, required: true, default: 480 },
    notes: { type: String, maxlength: 2000 },
    publishedAt: { type: Date },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishCount: { type: Number, required: true, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SchedulePlanSchema.index({ companyId: 1, startDate: -1 });
SchedulePlanSchema.index({ status: 1, startDate: -1 });

export const SchedulePlan =
  (mongoose.models.SchedulePlan as mongoose.Model<ISchedulePlan>) ||
  mongoose.model<ISchedulePlan>('SchedulePlan', SchedulePlanSchema);
