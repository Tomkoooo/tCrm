import mongoose, { Schema, type Document, type Types } from 'mongoose';

/** What the link is for — lets us revoke one purpose without touching the others. */
export type MagicLinkPurpose = 'schedule';

export interface IMagicLink extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** SHA-256 of the raw token — the raw value only ever lives in the email. */
  tokenHash: string;
  purpose: MagicLinkPurpose;
  /** Relative path to land on after sign-in (validated on consume). */
  redirectTo?: string;
  expiresAt: Date;
  /** Usable until it expires; every hit is counted so abuse is visible. */
  useCount: number;
  lastUsedAt?: Date;
  revokedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MagicLinkSchema = new Schema<IMagicLink>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    purpose: { type: String, enum: ['schedule'], required: true, index: true },
    redirectTo: { type: String, maxlength: 500 },
    expiresAt: { type: Date, required: true, index: true },
    useCount: { type: Number, required: true, default: 0 },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MagicLinkSchema.index({ userId: 1, purpose: 1, expiresAt: -1 });

export const MagicLink =
  (mongoose.models.MagicLink as mongoose.Model<IMagicLink>) ||
  mongoose.model<IMagicLink>('MagicLink', MagicLinkSchema);
