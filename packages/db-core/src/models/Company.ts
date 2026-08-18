import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICompany extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      unique: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, maxlength: 2000 },
  },
  // Preserve extra fields from the main-branch company tree (parentCompanyId, companyData).
  { timestamps: true, strict: false }
);

CompanySchema.index({ isActive: 1, name: 1 });

export const Company =
  (mongoose.models.Company as mongoose.Model<ICompany>) ||
  mongoose.model<ICompany>('Company', CompanySchema);
