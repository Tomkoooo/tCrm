import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICompany extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parentCompanyId?: Types.ObjectId;
  /** Custom key-value company attributes (e.g. tax number, address). */
  companyData?: Map<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    parentCompanyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    companyData: { type: Map, of: String, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Company =
  (mongoose.models.Company as mongoose.Model<ICompany>) ||
  mongoose.model<ICompany>('Company', CompanySchema);
