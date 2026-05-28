import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type MovementType = 'grn' | 'pick' | 'transfer' | 'adjustment' | 'return';
export type MovementStatus = 'draft' | 'confirmed' | 'cancelled';

export interface IMovementLine {
  productId: Types.ObjectId;
  quantity: number;
  fromWarehouseId?: Types.ObjectId;
  toWarehouseId?: Types.ObjectId;
  reservationId?: Types.ObjectId;
  note?: string;
}

export interface IStockMovement extends Document {
  _id: Types.ObjectId;
  type: MovementType;
  reference: string;
  status: MovementStatus;
  lines: IMovementLine[];
  fromWarehouseId?: Types.ObjectId;
  toWarehouseId?: Types.ObjectId;
  supplierId?: Types.ObjectId;
  note?: string;
  confirmedAt?: Date;
  confirmedBy?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MovementLineSchema = new Schema<IMovementLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    fromWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    toWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
    note: { type: String },
  },
  { _id: false }
);

const StockMovementSchema = new Schema<IStockMovement>(
  {
    type: {
      type: String,
      required: true,
      enum: ['grn', 'pick', 'transfer', 'adjustment', 'return'],
      index: true,
    },
    reference: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'confirmed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    lines: { type: [MovementLineSchema], default: [] },
    fromWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    toWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    note: { type: String },
    confirmedAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ type: 1, status: 1, createdAt: -1 });
StockMovementSchema.index({ 'lines.productId': 1 });

export const StockMovement =
  (mongoose.models.StockMovement as mongoose.Model<IStockMovement>) ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
