import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type StockAdjustmentReason =
  | 'physical_count'
  | 'damage'
  | 'correction'
  | 'initial_load'
  | 'grn'
  | 'pick'
  | 'transfer'
  | 'return'
  | 'reservation'
  | 'other';

export interface IStockAdjustment extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  delta: number;
  reason: StockAdjustmentReason;
  note?: string;
  byUserId: Types.ObjectId;
  at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    delta: { type: Number, required: true },
    reason: {
      type: String,
      required: true,
      enum: [
        'physical_count',
        'damage',
        'correction',
        'initial_load',
        'grn',
        'pick',
        'transfer',
        'return',
        'reservation',
        'other',
      ],
    },
    note: { type: String },
    byUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

StockAdjustmentSchema.index({ productId: 1, at: -1 });
StockAdjustmentSchema.index({ warehouseId: 1, at: -1 });

export const StockAdjustment =
  (mongoose.models.StockAdjustment as mongoose.Model<IStockAdjustment>) ||
  mongoose.model<IStockAdjustment>('StockAdjustment', StockAdjustmentSchema);
