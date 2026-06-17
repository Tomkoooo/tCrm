import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type TeamType = 'builders' | 'drivers' | 'mixed' | 'other';

export interface ITeam extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  name: string;
  slug: string;
  leaderEmployeeId: Types.ObjectId;
  memberEmployeeIds: Types.ObjectId[];
  teamType?: TeamType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    slug: {
      type: String,
      required: true,
      match: /^[a-z0-9-]+$/,
    },
    leaderEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    memberEmployeeIds: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    teamType: {
      type: String,
      enum: ['builders', 'drivers', 'mixed', 'other'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TeamSchema.index({ companyId: 1, slug: 1 }, { unique: true });

export const Team =
  (mongoose.models.Team as mongoose.Model<ITeam>) || mongoose.model<ITeam>('Team', TeamSchema);
