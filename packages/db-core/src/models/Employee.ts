import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type EmployeeScheduleMode = 'logistics' | 'roster';

export interface IEmployee extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  /** Optional CRM login linked to this membership. */
  userId?: Types.ObjectId;
  /** logistics = job sync owns work blocks; roster = HR can CRUD shifts. */
  scheduleMode: EmployeeScheduleMode;
  calendarColor?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, trim: true, lowercase: true, maxlength: 320, index: true },
    phone: { type: String, trim: true, maxlength: 64 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
    scheduleMode: {
      type: String,
      enum: ['logistics', 'roster'],
      required: true,
      default: 'logistics',
      index: true,
    },
    calendarColor: { type: String, maxlength: 32 },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, maxlength: 5000 },
  },
  // Preserve extra fields from the main-branch HR schema (employmentType, teamIds, …).
  { timestamps: true, strict: false }
);

EmployeeSchema.index({ companyId: 1, isActive: 1, name: 1 });
EmployeeSchema.index(
  { userId: 1, companyId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);

export const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployee>) ||
  mongoose.model<IEmployee>('Employee', EmployeeSchema);
