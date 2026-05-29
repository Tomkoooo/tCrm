import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IHrCompanyScope extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const HrCompanyScopeSchema = new Schema<IHrCompanyScope>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyIds: [{ type: Schema.Types.ObjectId, ref: 'Company' }],
  },
  { timestamps: true }
);

export const HrCompanyScope =
  (mongoose.models.HrCompanyScope as mongoose.Model<IHrCompanyScope>) ||
  mongoose.model<IHrCompanyScope>('HrCompanyScope', HrCompanyScopeSchema);
