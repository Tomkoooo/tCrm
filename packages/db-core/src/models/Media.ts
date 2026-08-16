import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type MediaType = 'file' | 'link';

export type MediaUsage = {
  entityType: string;
  entityId: Types.ObjectId;
  fieldName: string;
};

export interface IMedia extends Document {
  _id: Types.ObjectId;
  type: MediaType;
  /** SHA-256 hex for file deduplication */
  hash?: string;
  /** External URL for link-based media */
  url?: string;
  filename: string;
  contentType?: string;
  size?: number;
  /** GridFS file id (files only) */
  gridFsId?: Types.ObjectId;
  useCount: number;
  usages: MediaUsage[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaUsageSchema = new Schema<MediaUsage>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    fieldName: { type: String, required: true },
  },
  { _id: false }
);

const MediaSchema = new Schema<IMedia>(
  {
    type: { type: String, required: true, enum: ['file', 'link'], index: true },
    hash: { type: String, sparse: true, unique: true },
    url: { type: String },
    filename: { type: String, required: true },
    contentType: { type: String },
    size: { type: Number },
    gridFsId: { type: Schema.Types.ObjectId },
    useCount: { type: Number, default: 0, index: true },
    usages: { type: [MediaUsageSchema], default: [] },
  },
  { timestamps: true }
);

MediaSchema.index({ filename: 'text' });
MediaSchema.index(
  { url: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'link', url: { $type: 'string' } },
  }
);

export const Media =
  (mongoose.models.Media as mongoose.Model<IMedia>) || mongoose.model<IMedia>('Media', MediaSchema);
