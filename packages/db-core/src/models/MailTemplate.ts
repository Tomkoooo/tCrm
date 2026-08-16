import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IMailTemplate extends Document {
  _id: Types.ObjectId;
  key: string;
  subject: string;
  body: string;
  description?: string;
  variables: string[];
  enabled: boolean;
  recipientRoleKeys: string[];
  recipientUserIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MailTemplateSchema = new Schema<IMailTemplate>(
  {
    key: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    description: { type: String },
    variables: [{ type: String }],
    enabled: { type: Boolean, default: true },
    recipientRoleKeys: [{ type: String }],
    recipientUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MailTemplate =
  (mongoose.models.MailTemplate as mongoose.Model<IMailTemplate>) ||
  mongoose.model<IMailTemplate>('MailTemplate', MailTemplateSchema);
