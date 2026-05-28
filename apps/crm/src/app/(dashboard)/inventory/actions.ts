'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { connectDB, Product, StockAdjustment, StockLevel, Warehouse } from '@crm/db';
import { requirePermission, requireAuth } from '@crm/auth';
import { productSchema, stockAdjustmentSchema } from '@crm/lib/validation';

export type InventoryFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; sku?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export async function createProductAction(
  _prev: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await requirePermission('inventory:write');
  await connectDB();

  const candidate = {
    sku: formData.get('sku'),
    supplierSku: formData.get('supplierSku'),
    supplierNo: formData.get('supplierNo'),
    brand: formData.get('brand'),
    ean: formData.get('ean'),
    names: {
      de: formData.get('name_de'),
      en: formData.get('name_en'),
      hu: formData.get('name_hu'),
    },
    descriptions: {
      de: formData.get('long_description_de'),
      en: formData.get('long_description_en'),
      hu: formData.get('long_description_hu'),
    },
    colors: {
      de: formData.get('Color_de'),
      en: formData.get('Color_en'),
      hu: formData.get('Color_hu'),
    },
    dimensionsMm: {
      length: formData.get('length'),
      width: formData.get('width'),
      height: formData.get('height'),
    },
    weightKg: formData.get('weight'),
    packageWeightKg: formData.get('packageweight'),
    packageVolumeM3: formData.get('packagevolume'),
    pricing: {
      recommendedRetailPriceEur: formData.get('recommendet_retail_price_with_german_tax'),
      recommendedRetailPriceHuf: formData.get('recommendet_retail_price_with_tax_HUF'),
      streetPriceEur: formData.get('streetprice_with_german_tax'),
      streetPriceHuf: formData.get('streetprice_without_HUN_tax_HUF'),
      merchantPriceEur: formData.get('merchant_price'),
      merchantPriceHuf: formData.get('merchant_price_HUF'),
    },
    youtubeVideo: formData.get('youtubevideo'),
    youtubeId: formData.get('youtubeid'),
    freightLevel: formData.get('freightlevel'),
    stockLevelHint: formData.get('stocklevel'),
    availabilityWeeks: formData.get('availability_in_weeks'),
    inCategories: formData.get('inCategories'),
    isDiscontinued: formData.get('discontinued') === '1' || formData.get('discontinued') === 'true',
    isActive: formData.get('isActive') !== 'false',
    owner: formData.get('Owner'),
    rental: {
      rentFeeDay: formData.get('RentFeeDay'),
      rentFeeWeekend: formData.get('RentFeeWeekend'),
      rentFeeWeek: formData.get('RentFeeWeek'),
      rentFlag: formData.get('Rent'),
    },
    discounts: {
      discount1Max: formData.get('Discont 1.'),
      discount2Owner: formData.get('Discont 2.'),
    },
    externalImageHints: [],
    components: [],
    categoryPath: undefined,
  };

  const parsed = productSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(parsed.error.issues),
      message: 'Fix validation errors.',
    };
  }

  const existing = await Product.findOne({ sku: parsed.data.sku });
  if (existing) {
    return { success: false, message: 'SKU already exists.' };
  }

  const imageIds = formData
    .getAll('imageId')
    .map((v) => String(v))
    .filter(Boolean);

  await Product.create({
    sku: parsed.data.sku,
    supplierSku: parsed.data.supplierSku,
    supplierNo: parsed.data.supplierNo,
    brand: parsed.data.brand,
    ean: parsed.data.ean,
    names: parsed.data.names,
    descriptions: parsed.data.descriptions,
    colors: parsed.data.colors,
    dimensionsMm: parsed.data.dimensionsMm,
    weightKg: parsed.data.weightKg,
    packageWeightKg: parsed.data.packageWeightKg,
    packageVolumeM3: parsed.data.packageVolumeM3,
    pricing: parsed.data.pricing,
    youtubeVideo: parsed.data.youtubeVideo,
    youtubeId: parsed.data.youtubeId,
    freightLevel: parsed.data.freightLevel,
    stockLevelHint: parsed.data.stockLevelHint,
    availabilityWeeks: parsed.data.availabilityWeeks,
    inCategories: parsed.data.inCategories,
    isDiscontinued: parsed.data.isDiscontinued ?? false,
    isActive: parsed.data.isActive ?? true,
    owner: parsed.data.owner,
    rental: parsed.data.rental,
    discounts: parsed.data.discounts,
    externalImageHints: parsed.data.externalImageHints ?? [],
    imageIds: imageIds.map((id) => new mongoose.Types.ObjectId(id)),
    categoryIds: [],
    components: [],
  });

  revalidatePath('/inventory');
  return { success: true, message: 'Product created.', sku: parsed.data.sku };
}

export async function updateProductAction(
  _prev: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await requirePermission('inventory:write');
  await connectDB();

  const sku = String(formData.get('sku') ?? '').trim();
  const existing = await Product.findOne({ sku });
  if (!existing) return { success: false, message: 'Product not found.' };

  const candidate = {
    ...existing.toObject(),
    sku,
    supplierSku: formData.get('supplierSku'),
    supplierNo: formData.get('supplierNo'),
    brand: formData.get('brand'),
    ean: formData.get('ean'),
    names: {
      de: formData.get('name_de'),
      en: formData.get('name_en'),
      hu: formData.get('name_hu'),
    },
    descriptions: {
      de: formData.get('long_description_de'),
      en: formData.get('long_description_en'),
      hu: formData.get('long_description_hu'),
    },
    colors: {
      de: formData.get('Color_de'),
      en: formData.get('Color_en'),
      hu: formData.get('Color_hu'),
    },
    dimensionsMm: {
      length: formData.get('length'),
      width: formData.get('width'),
      height: formData.get('height'),
    },
    weightKg: formData.get('weight'),
    packageWeightKg: formData.get('packageweight'),
    packageVolumeM3: formData.get('packagevolume'),
    pricing: {
      recommendedRetailPriceEur: formData.get('recommendet_retail_price_with_german_tax'),
      recommendedRetailPriceHuf: formData.get('recommendet_retail_price_with_tax_HUF'),
      streetPriceEur: formData.get('streetprice_with_german_tax'),
      streetPriceHuf: formData.get('streetprice_without_HUN_tax_HUF'),
      merchantPriceEur: formData.get('merchant_price'),
      merchantPriceHuf: formData.get('merchant_price_HUF'),
    },
    youtubeVideo: formData.get('youtubevideo'),
    youtubeId: formData.get('youtubeid'),
    freightLevel: formData.get('freightlevel'),
    stockLevelHint: formData.get('stocklevel'),
    availabilityWeeks: formData.get('availability_in_weeks'),
    inCategories: formData.get('inCategories'),
    isDiscontinued: formData.get('discontinued') === '1' || formData.get('discontinued') === 'true',
    isActive: formData.get('isActive') !== 'false',
    owner: formData.get('Owner'),
    rental: {
      rentFeeDay: formData.get('RentFeeDay'),
      rentFeeWeekend: formData.get('RentFeeWeekend'),
      rentFeeWeek: formData.get('RentFeeWeek'),
      rentFlag: formData.get('Rent'),
    },
    discounts: {
      discount1Max: formData.get('Discont 1.'),
      discount2Owner: formData.get('Discont 2.'),
    },
  };

  const parsed = productSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(parsed.error.issues),
      message: 'Fix validation errors.',
    };
  }

  existing.set({
    supplierSku: parsed.data.supplierSku,
    supplierNo: parsed.data.supplierNo,
    brand: parsed.data.brand,
    ean: parsed.data.ean,
    names: parsed.data.names,
    descriptions: parsed.data.descriptions,
    colors: parsed.data.colors,
    dimensionsMm: parsed.data.dimensionsMm,
    weightKg: parsed.data.weightKg,
    packageWeightKg: parsed.data.packageWeightKg,
    packageVolumeM3: parsed.data.packageVolumeM3,
    pricing: parsed.data.pricing,
    youtubeVideo: parsed.data.youtubeVideo,
    youtubeId: parsed.data.youtubeId,
    freightLevel: parsed.data.freightLevel,
    stockLevelHint: parsed.data.stockLevelHint,
    availabilityWeeks: parsed.data.availabilityWeeks,
    inCategories: parsed.data.inCategories,
    isDiscontinued: parsed.data.isDiscontinued ?? false,
    isActive: parsed.data.isActive ?? true,
    owner: parsed.data.owner,
    rental: parsed.data.rental,
    discounts: parsed.data.discounts,
  });

  await existing.save();
  revalidatePath(`/inventory/${sku}`);
  return { success: true, message: 'Product updated.', sku };
}

export async function deleteProductAction(
  _prev: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await requirePermission('inventory:delete');
  await connectDB();

  const sku = String(formData.get('sku') ?? '').trim();
  const existing = await Product.findOne({ sku });
  if (!existing) return { success: false, message: 'Product not found.' };

  existing.isActive = false;
  await existing.save();
  revalidatePath('/inventory');
  return { success: true, message: 'Product deactivated.', sku };
}

export type StockAdjustState = { success: boolean; message: string };

export async function adjustStockAction(
  _prev: StockAdjustState,
  formData: FormData
): Promise<StockAdjustState> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user) return { success: false, message: 'Not authenticated.' };
  await connectDB();

  const parsed = stockAdjustmentSchema.safeParse({
    productId: formData.get('productId'),
    warehouseId: formData.get('warehouseId'),
    delta: formData.get('delta'),
    reason: formData.get('reason'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    return { success: false, message: 'Invalid adjustment input.' };
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const productId = new mongoose.Types.ObjectId(parsed.data.productId);
      const warehouseId = new mongoose.Types.ObjectId(parsed.data.warehouseId);

      await Warehouse.findById(warehouseId).session(session);

      const stock = await StockLevel.findOneAndUpdate(
        { productId, warehouseId },
        {
          $inc: { onHand: parsed.data.delta },
          $set: { lastChangedAt: new Date(), lastChangedBy: user.id },
        },
        { upsert: true, new: true, session }
      );

      await StockAdjustment.create(
        [
          {
            productId,
            warehouseId,
            delta: parsed.data.delta,
            reason: parsed.data.reason,
            note: parsed.data.note,
            byUserId: user.id,
            at: new Date(),
          },
        ],
        { session }
      );

      // ensure onHand isn't negative in Phase 1
      if (stock.onHand < 0) {
        throw new Error('Stock cannot be negative.');
      }
    });
  } catch (e: any) {
    return { success: false, message: e?.message ?? 'Adjustment failed.' };
  } finally {
    session.endSession();
  }

  revalidatePath('/inventory');
  return { success: true, message: 'Stock adjusted.' };
}
