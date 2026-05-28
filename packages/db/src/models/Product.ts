import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type I18nText = {
  de?: string;
  en?: string;
  hu?: string;
};

export type ProductComponent = {
  productId: Types.ObjectId;
  quantity: number;
};

export interface IProduct extends Document {
  _id: Types.ObjectId;

  sku: string; // product_id_SM
  internalSku?: string;
  supplierSku?: string; // product_id
  supplierNo?: string;
  supplierId?: Types.ObjectId;
  brand?: string;
  ean?: string;

  names: I18nText;
  descriptions?: I18nText;
  colors?: I18nText;

  dimensionsMm?: {
    length?: number;
    width?: number;
    height?: number;
  };

  weightKg?: number;
  packageWeightKg?: number;
  packageVolumeM3?: number;

  pricing?: {
    recommendedRetailPriceEur?: number;
    recommendedRetailPriceHuf?: number;
    streetPriceEur?: number;
    streetPriceHuf?: number;
    merchantPriceEur?: number;
    merchantPriceHuf?: number;
  };

  youtubeId?: string;
  youtubeVideo?: string;

  imageIds: Types.ObjectId[]; // GridFS ids
  externalImageHints?: string[]; // bild1..bild5 (import hints)

  freightLevel?: number;
  stockLevelHint?: number;
  availabilityWeeks?: number;

  categoryIds: Types.ObjectId[];

  components: ProductComponent[];

  inCategories?: string;
  isDiscontinued: boolean;
  isActive: boolean;

  owner?: string;

  rental?: {
    rentFeeDay?: number;
    rentFeeWeekend?: number;
    rentFeeWeek?: number;
    rentFlag?: 1 | 2; // 1 rentable, 2 not standalone rentable
  };

  discounts?: {
    discount1Max?: number;
    discount2Owner?: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const I18nTextSchema = new Schema<I18nText>(
  {
    de: { type: String },
    en: { type: String },
    hu: { type: String },
  },
  { _id: false }
);

const ProductComponentSchema = new Schema<ProductComponent>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    sku: { type: String, required: true, unique: true, index: true },
    internalSku: { type: String, unique: true, sparse: true, index: true },
    supplierSku: { type: String },
    supplierNo: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    brand: { type: String, index: true },
    ean: { type: String, index: true },

    names: { type: I18nTextSchema, required: true },
    descriptions: { type: I18nTextSchema },
    colors: { type: I18nTextSchema },

    dimensionsMm: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },

    weightKg: { type: Number },
    packageWeightKg: { type: Number },
    packageVolumeM3: { type: Number },

    pricing: {
      recommendedRetailPriceEur: { type: Number },
      recommendedRetailPriceHuf: { type: Number },
      streetPriceEur: { type: Number },
      streetPriceHuf: { type: Number },
      merchantPriceEur: { type: Number },
      merchantPriceHuf: { type: Number },
    },

    youtubeId: { type: String },
    youtubeVideo: { type: String },

    imageIds: [{ type: Schema.Types.ObjectId }],
    externalImageHints: [{ type: String }],

    freightLevel: { type: Number },
    stockLevelHint: { type: Number },
    availabilityWeeks: { type: Number },

    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],

    components: { type: [ProductComponentSchema], default: [] },

    inCategories: { type: String },
    isDiscontinued: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },

    owner: { type: String },

    rental: {
      rentFeeDay: { type: Number },
      rentFeeWeekend: { type: Number },
      rentFeeWeek: { type: Number },
      rentFlag: { type: Number, enum: [1, 2] },
    },

    discounts: {
      discount1Max: { type: Number },
      discount2Owner: { type: Number },
    },
  },
  { timestamps: true }
);

ProductSchema.index({
  sku: 'text',
  ean: 'text',
  brand: 'text',
  'names.de': 'text',
  'names.en': 'text',
  'names.hu': 'text',
});

export const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>('Product', ProductSchema);
