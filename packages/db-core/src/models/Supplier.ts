import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ISupplierContact {
  role: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  key: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  taxNo?: string;
  euTaxNo?: string;
  registry?: string;
  contacts?: ISupplierContact[];
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phone: { type: String },
    email: { type: String },
    taxNo: { type: String },
    euTaxNo: { type: String },
    registry: { type: String },
    contacts: [
      {
        role: { type: String, required: true },
        name: { type: String },
        phone: { type: String },
        email: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Supplier =
  (mongoose.models.Supplier as mongoose.Model<ISupplier>) ||
  mongoose.model<ISupplier>('Supplier', SupplierSchema);
