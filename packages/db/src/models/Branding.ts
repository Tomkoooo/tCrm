import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IBranding extends Document {
  _id: Types.ObjectId;
  appName: string;
  companyName: string;
  faviconId?: Types.ObjectId;
  logoId?: Types.ObjectId;
  loginBackgroundId?: Types.ObjectId;
  loginTitle: string;
  loginSubtitle: string;
  footerText: string;
  createdAt: Date;
  updatedAt: Date;
}

const BrandingSchema = new Schema<IBranding>(
  {
    appName: { type: String, required: true, default: 'tCrm' },
    companyName: { type: String, required: true, default: 'Belső CRM' },
    faviconId: { type: Schema.Types.ObjectId, ref: 'Media' },
    logoId: { type: Schema.Types.ObjectId, ref: 'Media' },
    loginBackgroundId: { type: Schema.Types.ObjectId, ref: 'Media' },
    loginTitle: { type: String, required: true, default: 'Sign in to tCrm' },
    loginSubtitle: {
      type: String,
      required: true,
      default: 'Enter your credentials to access the CRM',
    },
    footerText: {
      type: String,
      required: true,
      default: '© 2026 tCrm. Minden jog fenntartva.',
    },
  },
  { timestamps: true }
);

export const Branding =
  (mongoose.models.Branding as mongoose.Model<IBranding>) ||
  mongoose.model<IBranding>('Branding', BrandingSchema);
