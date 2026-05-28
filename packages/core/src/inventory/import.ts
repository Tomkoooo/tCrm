import * as XLSX from 'xlsx';
import { connectDB, Category, Product, StockAdjustment, StockLevel, Warehouse } from '@crm/db';
import { inventoryImportRowSchema, productSchema, skuSchema } from '@crm/lib/validation';
import type { ProductInput } from '@crm/lib/validation';
import type { Types } from 'mongoose';
import { ALUTENT_COLUMNS } from './excel-columns';
import { generateInternalSku } from './sku';

export type ParseIssue = { row: number; field?: string; message: string };

export type ParsedInventoryRow = {
  product: ProductInput;
  warehouses: Record<string, number>;
  componentSkus: Array<{ sku: string; quantity: number }>;
};

export type ParseResult = {
  rows: ParsedInventoryRow[];
  errors: ParseIssue[];
  warnings: ParseIssue[];
};

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function toStringClean(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  if (!s || s === '-') return undefined;
  return s;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseInventoryXlsx(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const errors: ParseIssue[] = [];
  const warnings: ParseIssue[] = [];
  const rows: ParsedInventoryRow[] = [];

  raw.forEach((r, idx) => {
    const rowNumber = idx + 2; // header row is 1
    const skuRaw = toStringClean(r['product_id_SM']);
    const skuParsed = skuSchema.safeParse(skuRaw);
    if (!skuParsed.success) {
      errors.push({
        row: rowNumber,
        field: 'product_id_SM',
        message: skuParsed.error.issues[0]?.message ?? 'Invalid SKU',
      });
      return;
    }

    const externalImageHints = ['bild1', 'bild2', 'bild3', 'bild4', 'bild5']
      .map((k) => toStringClean(r[k]))
      .filter(Boolean) as string[];

    const componentSkus: Array<{ sku: string; quantity: number }> = [];
    for (const n of [1, 2, 3, 4]) {
      const relatedSku = toStringClean(r[`Relatedproduct_${n}`]);
      const qty = toNumber(r[`Relatedproduct_pc_${n}`]);
      if (relatedSku && qty && qty > 0) {
        componentSkus.push({ sku: relatedSku, quantity: qty });
      } else if (relatedSku && (!qty || qty <= 0)) {
        warnings.push({
          row: rowNumber,
          field: `Relatedproduct_pc_${n}`,
          message: `Component quantity missing for ${relatedSku}`,
        });
      }
    }

    const productCandidate: ProductInput = {
      sku: skuParsed.data,
      supplierSku: toStringClean(r['product_id']),
      supplierNo: toStringClean(r['supplierNo']),
      brand: toStringClean(r['brand']),
      ean: toStringClean(r['ean']),
      names: {
        de: toStringClean(r['name_de']),
        en: toStringClean(r['name_en']),
        hu: toStringClean(r['name_hu']),
      },
      descriptions: {
        de: toStringClean(r['long_description_de']),
        en: toStringClean(r['long_description_en']),
        hu: toStringClean(r['long_description_hu']),
      },
      colors: {
        de: toStringClean(r['Color_de']),
        en: toStringClean(r['Color_en']),
        hu: toStringClean(r['Color_hu']),
      },
      dimensionsMm: {
        length: toNumber(r['length']),
        width: toNumber(r['width']),
        height: toNumber(r['height']),
      },
      weightKg: toNumber(r['weight']),
      packageWeightKg: toNumber(r['packageweight']),
      packageVolumeM3: toNumber(r['packagevolume']),
      pricing: {
        recommendedRetailPriceEur: toNumber(r['recommendet_retail_price_with_german_tax']),
        recommendedRetailPriceHuf: toNumber(r['recommendet_retail_price_with_tax_HUF']),
        streetPriceEur: toNumber(r['streetprice_with_german_tax']),
        streetPriceHuf: toNumber(r['streetprice_without_HUN_tax_HUF']),
        merchantPriceEur: toNumber(r['merchant_price']),
        merchantPriceHuf: toNumber(r['merchant_price_HUF']),
      },
      youtubeVideo: toStringClean(r['youtubevideo']),
      youtubeId: toStringClean(r['youtubeid']),
      freightLevel: toNumber(r['freightlevel']),
      stockLevelHint: toNumber(r['stocklevel']),
      availabilityWeeks: toNumber(r['availability_in_weeks']),
      inCategories: toStringClean(r['inCategories']),
      isDiscontinued: Boolean(toNumber(r['discontinued']) ?? 0),
      isActive: true,
      owner: toStringClean(r['Owner']),
      rental: {
        rentFeeDay: toNumber(r['RentFeeDay']),
        rentFeeWeekend: toNumber(r['RentFeeWeekend']),
        rentFeeWeek: toNumber(r['RentFeeWeek']),
        rentFlag: (() => {
          const v = toNumber(r['Rent']);
          return v === 1 || v === 2 ? (v as 1 | 2) : undefined;
        })(),
      },
      discounts: {
        discount1Max: toNumber(r['Discont 1.']),
        discount2Owner: toNumber(r['Discont 2.']),
      },
      externalImageHints,
      components: componentSkus.map((c) => ({ productSku: c.sku, quantity: c.quantity })),
      categoryPath: {
        cat1: {
          de: toStringClean(r['cat1Name']),
          en: toStringClean(r['cat1Name_en']),
          hu: toStringClean(r['cat1Name_hu']),
        },
        cat2: {
          de: toStringClean(r['cat2Name']),
          en: toStringClean(r['cat2Name_en']),
          hu: toStringClean(r['cat2Name_hu']),
        },
        cat3: {
          de: toStringClean(r['Cat3Name']),
          en: toStringClean(r['cat3Name_en']),
          hu: toStringClean(r['cat3Name_hu']),
        },
      },
    };

    const validated = productSchema.safeParse(productCandidate);
    if (!validated.success) {
      for (const issue of validated.error.issues) {
        errors.push({ row: rowNumber, field: issue.path.join('.'), message: issue.message });
      }
      return;
    }

    const warehouses: Record<string, number> = {};
    for (const k of ['warehouse 1.', 'warehouse 2.', 'warehouse 3.'] as const) {
      const qty = toNumber(r[k]);
      if (qty !== undefined) warehouses[k] = qty;
    }

    // warn on unknown columns
    for (const key of Object.keys(r)) {
      if (!(ALUTENT_COLUMNS as readonly string[]).includes(key)) {
        warnings.push({ row: rowNumber, field: key, message: 'Unknown column will be ignored' });
      }
    }

    const rowValidated = inventoryImportRowSchema.safeParse({
      product: validated.data,
      warehouses,
    });
    if (!rowValidated.success) {
      for (const issue of rowValidated.error.issues) {
        errors.push({ row: rowNumber, field: issue.path.join('.'), message: issue.message });
      }
      return;
    }

    rows.push({
      product: validated.data,
      warehouses,
      componentSkus,
    });
  });

  return { rows, errors, warnings };
}

export type ImportReport = {
  created: number;
  updated: number;
  stockUpserts: number;
  categoryUpserts: number;
  warehouseUpserts: number;
  componentLinkWarnings: number;
};

async function upsertWarehouseByColumn(columnName: string): Promise<Types.ObjectId> {
  const map: Record<string, { key: string; name: string }> = {
    'warehouse 1.': { key: 'kispest', name: 'Kispest raktár' },
    'warehouse 2.': { key: 'erzsebet', name: 'Erzsébet raktár' },
    'warehouse 3.': { key: 'recsei', name: 'Récsei Raktár' },
  };
  const info = map[columnName] ?? { key: slugify(columnName), name: columnName };
  const wh = await Warehouse.findOneAndUpdate(
    { key: info.key },
    { $setOnInsert: { key: info.key, name: info.name, isActive: true } },
    { upsert: true, new: true }
  ).exec();
  return wh._id;
}

async function upsertCategoryPath(product: ProductInput): Promise<Types.ObjectId[]> {
  const cat1Name = product.categoryPath?.cat1;
  const cat2Name = product.categoryPath?.cat2;
  const cat3Name = product.categoryPath?.cat3;

  const ids: Types.ObjectId[] = [];
  let parentId: Types.ObjectId | undefined;

  const levels: Array<{ level: 1 | 2 | 3; names?: { de?: string; en?: string; hu?: string } }> = [
    { level: 1, names: cat1Name },
    { level: 2, names: cat2Name },
    { level: 3, names: cat3Name },
  ];

  for (const l of levels) {
    if (!l.names || (!l.names.de && !l.names.en && !l.names.hu)) break;
    const basis = l.names.en ?? l.names.hu ?? l.names.de ?? `level-${l.level}`;
    const slug = slugify(basis);
    const cat = await Category.findOneAndUpdate(
      { level: l.level, parentId: parentId ?? undefined, slug },
      { $set: { names: l.names, slug }, $setOnInsert: { level: l.level, parentId } },
      { upsert: true, new: true }
    ).exec();
    ids.push(cat._id);
    parentId = cat._id;
  }

  return ids;
}

export async function commitInventoryImport(
  parsed: ParseResult,
  userId: string,
  options?: { supplierId?: string; categoryId?: string }
): Promise<ImportReport> {
  await connectDB();

  let created = 0;
  let updated = 0;
  let stockUpserts = 0;
  let categoryUpserts = 0;
  let warehouseUpserts = 0;
  let componentLinkWarnings = 0;

  const skuToId = new Map<string, Types.ObjectId>();
  const skuToInternalSku = new Map<string, string>();

  const forcedSupplierId = options?.supplierId ? String(options.supplierId) : undefined;
  const forcedCategoryId = options?.categoryId ? String(options.categoryId) : undefined;
  const forcedCategory = forcedCategoryId
    ? await Category.findById(forcedCategoryId).lean().exec()
    : null;

  // First pass: upsert products and categories
  for (const row of parsed.rows) {
    const categoryIds = await upsertCategoryPath(row.product);
    if (categoryIds.length > 0) categoryUpserts += categoryIds.length;

    const chosenCategoryId = forcedCategoryId ?? categoryIds[categoryIds.length - 1]?.toString();
    const chosenCategory =
      forcedCategory ??
      (chosenCategoryId ? await Category.findById(chosenCategoryId).lean().exec() : null);

    const internalSku =
      chosenCategory?.skuPrefix && chosenCategory?.skuTotalLength
        ? generateInternalSku(
            {
              prefix: chosenCategory.skuPrefix,
              totalLength: chosenCategory.skuTotalLength,
              padChar: chosenCategory.skuPadChar ?? '0',
            },
            row.product.sku
          )
        : undefined;

    const doc = await Product.findOne({ sku: row.product.sku }).exec();
    if (!doc) {
      const createdDoc = await Product.create({
        sku: row.product.sku,
        internalSku,
        supplierSku: row.product.supplierSku,
        supplierNo: row.product.supplierNo,
        supplierId: forcedSupplierId ?? chosenCategory?.supplierId?.toString() ?? undefined,
        brand: row.product.brand,
        ean: row.product.ean,
        names: row.product.names,
        descriptions: row.product.descriptions,
        colors: row.product.colors,
        dimensionsMm: row.product.dimensionsMm,
        weightKg: row.product.weightKg,
        packageWeightKg: row.product.packageWeightKg,
        packageVolumeM3: row.product.packageVolumeM3,
        pricing: row.product.pricing,
        youtubeId: row.product.youtubeId,
        youtubeVideo: row.product.youtubeVideo,
        externalImageHints: row.product.externalImageHints ?? [],
        imageIds: [],
        freightLevel: row.product.freightLevel,
        stockLevelHint: row.product.stockLevelHint,
        availabilityWeeks: row.product.availabilityWeeks,
        categoryIds: Array.from(
          new Set([
            ...(categoryIds ?? []).map((id) => id.toString()),
            ...(chosenCategoryId ? [chosenCategoryId] : []),
          ])
        ),
        components: [],
        inCategories: row.product.inCategories,
        isDiscontinued: row.product.isDiscontinued ?? false,
        isActive: true,
        owner: row.product.owner,
        rental: row.product.rental,
        discounts: row.product.discounts,
      });
      created++;
      skuToId.set(row.product.sku, createdDoc._id);
      if (internalSku) skuToInternalSku.set(row.product.sku, internalSku);
    } else {
      doc.set({
        internalSku,
        supplierSku: row.product.supplierSku,
        supplierNo: row.product.supplierNo,
        supplierId:
          forcedSupplierId ??
          chosenCategory?.supplierId?.toString() ??
          (doc.supplierId ? doc.supplierId.toString() : undefined),
        brand: row.product.brand,
        ean: row.product.ean,
        names: row.product.names,
        descriptions: row.product.descriptions,
        colors: row.product.colors,
        dimensionsMm: row.product.dimensionsMm,
        weightKg: row.product.weightKg,
        packageWeightKg: row.product.packageWeightKg,
        packageVolumeM3: row.product.packageVolumeM3,
        pricing: row.product.pricing,
        youtubeId: row.product.youtubeId,
        youtubeVideo: row.product.youtubeVideo,
        externalImageHints: row.product.externalImageHints ?? [],
        freightLevel: row.product.freightLevel,
        stockLevelHint: row.product.stockLevelHint,
        availabilityWeeks: row.product.availabilityWeeks,
        categoryIds: Array.from(
          new Set([
            ...(categoryIds ?? []).map((id) => id.toString()),
            ...(chosenCategoryId ? [chosenCategoryId] : []),
          ])
        ),
        inCategories: row.product.inCategories,
        isDiscontinued: row.product.isDiscontinued ?? false,
        owner: row.product.owner,
        rental: row.product.rental,
        discounts: row.product.discounts,
        isActive: true,
      });
      await doc.save();
      updated++;
      skuToId.set(row.product.sku, doc._id);
      if (internalSku) skuToInternalSku.set(row.product.sku, internalSku);
    }
  }

  // Second pass: link components (BOM)
  for (const row of parsed.rows) {
    const productId = skuToId.get(row.product.sku);
    if (!productId) continue;

    const componentRefs: Array<{ productId: Types.ObjectId; quantity: number }> = [];
    for (const c of row.componentSkus) {
      const compId = skuToId.get(c.sku);
      if (!compId) {
        componentLinkWarnings++;
        continue;
      }
      componentRefs.push({ productId: compId, quantity: c.quantity });
    }

    await Product.updateOne({ _id: productId }, { $set: { components: componentRefs } }).exec();
  }

  // Stock levels + adjustments for initial load
  for (const row of parsed.rows) {
    const productId = skuToId.get(row.product.sku);
    if (!productId) continue;

    for (const [colName, qty] of Object.entries(row.warehouses)) {
      const warehouseId = await upsertWarehouseByColumn(colName);
      warehouseUpserts++;

      await StockLevel.findOneAndUpdate(
        { productId, warehouseId },
        {
          $set: {
            onHand: qty,
            lastChangedAt: new Date(),
            lastChangedBy: userId as unknown as Types.ObjectId,
          },
        },
        { upsert: true, new: true }
      ).exec();
      stockUpserts++;

      await StockAdjustment.create({
        productId,
        warehouseId,
        delta: qty,
        reason: 'initial_load',
        note: 'Initial load from Excel import',
        byUserId: userId,
        at: new Date(),
      });
    }
  }

  return {
    created,
    updated,
    stockUpserts,
    categoryUpserts,
    warehouseUpserts,
    componentLinkWarnings,
  };
}
