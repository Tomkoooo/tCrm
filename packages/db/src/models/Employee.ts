import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type EmploymentType = 'employee' | 'guest';
export type WorkerCategory = 'regular' | 'occasional';
export type WorkScheduleType = 'full_time' | 'part_time';
export type EmployeePayType = 'monthly' | 'hourly';

export interface IEmployeePersonalData {
  birthName?: string;
  birthPlaceDate?: string;
  mothersName?: string;
  address?: string;
  taj?: string;
  taxId?: string;
}

export interface IEmployee extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  email?: string;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  userId?: Types.ObjectId;
  employmentType: EmploymentType;
  workerCategory: WorkerCategory;
  workScheduleType: WorkScheduleType;
  contractedWeeklyHours?: number;
  contractedDailyHours?: number;
  payType?: EmployeePayType;
  monthlySalaryHuf?: number;
  hourlyRateHuf?: number;
  calendarColor?: string;
  personalData?: IEmployeePersonalData;
  isActive: boolean;
  hrNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, index: true },
    employeeNumber: { type: String },
    department: { type: String },
    phone: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
    employmentType: {
      type: String,
      enum: ['employee', 'guest'],
      default: 'guest',
    },
    workerCategory: {
      type: String,
      enum: ['regular', 'occasional'],
      default: 'regular',
    },
    workScheduleType: {
      type: String,
      enum: ['full_time', 'part_time'],
      default: 'full_time',
    },
    contractedWeeklyHours: { type: Number, min: 0 },
    contractedDailyHours: { type: Number, min: 0 },
    payType: { type: String, enum: ['monthly', 'hourly'] },
    monthlySalaryHuf: { type: Number, min: 0 },
    hourlyRateHuf: { type: Number, min: 0 },
    calendarColor: { type: String },
    personalData: {
      birthName: { type: String },
      birthPlaceDate: { type: String },
      mothersName: { type: String },
      address: { type: String },
      taj: { type: String },
      taxId: { type: String },
    },
    isActive: { type: Boolean, default: true },
    hrNotes: { type: String },
  },
  { timestamps: true }
);

EmployeeSchema.index({ userId: 1, companyId: 1 }, { unique: true, sparse: true });

export const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployee>) ||
  mongoose.model<IEmployee>('Employee', EmployeeSchema);
