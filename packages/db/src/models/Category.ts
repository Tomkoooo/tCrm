import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  level: 1 | 2 | 3;
  parentId?: Types.ObjectId;
  slug: string;
  supplierId?: Types.ObjectId;
  skuPrefix?: string;
  skuTotalLength?: number;
  skuPadChar?: string;
  names: {
    de?: string;
    en?: string;
    hu?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    level: { type: Number, required: true, enum: [1, 2, 3], index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    slug: { type: String, required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    skuPrefix: { type: String },
    skuTotalLength: { type: Number },
    skuPadChar: { type: String, default: '0' },
    names: {
      de: { type: String },
      en: { type: String },
      hu: { type: String },
    },
  },
  { timestamps: true }
);

CategorySchema.index({ parentId: 1, level: 1 });
CategorySchema.index({ slug: 1 }, { unique: false });

export const Category =
  (mongoose.models.Category as mongoose.Model<ICategory>) ||
  mongoose.model<ICategory>('Category', CategorySchema);
