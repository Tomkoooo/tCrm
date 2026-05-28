import mongoose, { Schema, type Document, type Types } from 'mongoose';

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

  contacts?: {
    ceoName?: string;
    ceoPhone?: string;
    ceoEmail?: string;
    salesName?: string;
    salesPhone?: string;
    salesEmail?: string;
    technicalName?: string;
    technicalPhone?: string;
    technicalEmail?: string;
    warehouseName?: string;
    warehousePhone?: string;
    warehouseEmail?: string;
    financeName?: string;
    financePhone?: string;
    financeEmail?: string;
  };

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
    contacts: {
      ceoName: { type: String },
      ceoPhone: { type: String },
      ceoEmail: { type: String },
      salesName: { type: String },
      salesPhone: { type: String },
      salesEmail: { type: String },
      technicalName: { type: String },
      technicalPhone: { type: String },
      technicalEmail: { type: String },
      warehouseName: { type: String },
      warehousePhone: { type: String },
      warehouseEmail: { type: String },
      financeName: { type: String },
      financePhone: { type: String },
      financeEmail: { type: String },
    },
  },
  { timestamps: true }
);

export const Supplier =
  (mongoose.models.Supplier as mongoose.Model<ISupplier>) ||
  mongoose.model<ISupplier>('Supplier', SupplierSchema);
