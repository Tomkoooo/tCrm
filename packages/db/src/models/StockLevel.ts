import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IStockLevel extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  onHand: number;
  reserved: number;
  lastCountAt?: Date;
  lastChangedAt?: Date;
  lastChangedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockLevelSchema = new Schema<IStockLevel>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    lastCountAt: { type: Date },
    lastChangedAt: { type: Date },
    lastChangedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

StockLevelSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });
StockLevelSchema.index({ warehouseId: 1, onHand: 1 });

export const StockLevel =
  (mongoose.models.StockLevel as mongoose.Model<IStockLevel>) ||
  mongoose.model<IStockLevel>('StockLevel', StockLevelSchema);
