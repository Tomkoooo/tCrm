import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ICounter extends Document {
  _id: Types.ObjectId;
  key: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true, index: true },
  seq: { type: Number, default: 0 },
});

export const Counter =
  (mongoose.models.Counter as mongoose.Model<ICounter>) ||
  mongoose.model<ICounter>('Counter', CounterSchema);
