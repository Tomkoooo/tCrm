import * as XLSX from 'xlsx';
import {
  connectDB,
  Category,
  Product,
  StockAdjustment,
  StockLevel,
  Supplier,
  Warehouse,
} from '@crm/db';
import { inventoryImportRowSchema, productSchema, skuSchema } from '@crm/lib/validation';
import type { ProductInput } from '@crm/lib/validation';
import type { Types } from 'mongoose';
import { ALUTENT_COLUMNS } from './excel-columns';
import { generateInternalSku } from './sku';

export type ParseIssue = { row: number; field?: string; message: string };

export type ParsedInventoryRow = {
  rowNumber: number;
  crmCategorySlug: string;
  /** Per-row supplier key from Excel; falls back to import default when omitted */
  crmSupplierSlug?: string;
  /** Legacy Excel product_id_SM — validated against generated CRM SKU at prepare time */
  legacyCrmSkuHint?: string;
  product: ProductInput;
  warehouses: Record<string, number>;
  componentSkus: Array<{ sku: string; quantity: number }>;
};

export type PrepareImportResult = {
  ready: ParsedInventoryRow[];
  skipped: ParseIssue[];
  warnings: ParseIssue[];
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function resolveRowSupplierKey(
  row: ParsedInventoryRow,
  defaultSupplierKey?: string
): string | undefined {
  return row.crmSupplierSlug || defaultSupplierKey;
}

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

    const supplierSkuRaw = toStringClean(r['product_id']);
    if (!supplierSkuRaw) {
      errors.push({
        row: rowNumber,
        field: 'product_id',
        message: 'Beszállítói SKU kötelező (product_id oszlop).',
      });
      return;
    }

    const legacySm = toStringClean(r['product_id_SM']);
    const skuForSchema = legacySm ?? supplierSkuRaw;
    const skuParsed = skuSchema.safeParse(skuForSchema);
    if (!skuParsed.success) {
      errors.push({
        row: rowNumber,
        field: legacySm ? 'product_id_SM' : 'product_id',
        message: skuParsed.error.issues[0]?.message ?? 'Érvénytelen SKU formátum.',
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

    const crmSlugRaw = toStringClean(r['crm_category_slug']);
    if (!crmSlugRaw) {
      errors.push({
        row: rowNumber,
        field: 'crm_category_slug',
        message: 'CRM kategória slug kötelező (crm_category_slug oszlop).',
      });
      return;
    }
    const crmCategorySlug = crmSlugRaw.toLowerCase();
    if (!SLUG_PATTERN.test(crmCategorySlug)) {
      errors.push({
        row: rowNumber,
        field: 'crm_category_slug',
        message: 'Érvénytelen slug formátum (kisbetű, szám, kötőjel).',
      });
      return;
    }

    const supplierSlugRaw = toStringClean(r['crm_supplier_slug']);
    let crmSupplierSlug: string | undefined;
    if (supplierSlugRaw) {
      crmSupplierSlug = supplierSlugRaw.toLowerCase();
      if (!SLUG_PATTERN.test(crmSupplierSlug)) {
        errors.push({
          row: rowNumber,
          field: 'crm_supplier_slug',
          message: 'Érvénytelen beszállító slug formátum (crm_supplier_slug).',
        });
        return;
      }
    }

    const shipperCategoryPath = {
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
    };

    const productCandidate: ProductInput = {
      sku: skuParsed.data,
      supplierSku: supplierSkuRaw,
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
      shipperCategoryPath,
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
      rowNumber,
      crmCategorySlug,
      crmSupplierSlug,
      legacyCrmSkuHint: legacySm,
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
  skipped: number;
  skippedIssues: ParseIssue[];
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

/**
 * Soronként: beszállító + kategória SKU beállítás → CRM SKU = előtag + beszállítói SKU.
 * Hibás sorok kihagyva (skipped), nem állítja meg a teljes importot.
 */
export async function prepareImportRows(
  parsed: ParseResult,
  defaultSupplierKey?: string
): Promise<PrepareImportResult> {
  await connectDB();

  const ready: ParsedInventoryRow[] = [];
  const skipped: ParseIssue[] = [...parsed.errors];
  const warnings: ParseIssue[] = [...parsed.warnings];

  if (parsed.rows.length === 0) {
    return { ready, skipped, warnings };
  }

  const categorySlugs = [...new Set(parsed.rows.map((r) => r.crmCategorySlug))];
  const categories = await Category.find({ slug: { $in: categorySlugs } })
    .lean()
    .exec();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const supplierKeys = new Set<string>();
  for (const row of parsed.rows) {
    const key = resolveRowSupplierKey(row, defaultSupplierKey);
    if (key) supplierKeys.add(key);
  }
  const suppliers = await Supplier.find({ key: { $in: [...supplierKeys] } })
    .lean()
    .exec();
  const supplierByKey = new Map(suppliers.map((s) => [s.key, s]));

  for (const row of parsed.rows) {
    const supplierKey = resolveRowSupplierKey(row, defaultSupplierKey);
    if (!supplierKey) {
      skipped.push({
        row: row.rowNumber,
        field: 'crm_supplier_slug',
        message:
          'Adja meg a crm_supplier_slug oszlopot, vagy válasszon alapértelmezett beszállítót az import ablakban.',
      });
      continue;
    }
    if (!supplierByKey.has(supplierKey)) {
      skipped.push({
        row: row.rowNumber,
        field: 'crm_supplier_slug',
        message: `Ismeretlen beszállító slug: „${supplierKey}”. Hozza létre: Beszállítók menü.`,
      });
      continue;
    }

    const cat = categoryBySlug.get(row.crmCategorySlug);
    if (!cat) {
      skipped.push({
        row: row.rowNumber,
        field: 'crm_category_slug',
        message: `Ismeretlen CRM kategória: „${row.crmCategorySlug}”.`,
      });
      continue;
    }
    if (!cat.skuPrefix || !cat.skuTotalLength) {
      skipped.push({
        row: row.rowNumber,
        field: 'crm_category_slug',
        message: `A „${cat.slug}” kategórián állítsa be az SKU előtagot és teljes hosszt (Termékkategóriák).`,
      });
      continue;
    }

    const supplierSku = row.product.supplierSku?.trim();
    if (!supplierSku) {
      skipped.push({
        row: row.rowNumber,
        field: 'product_id',
        message: 'Beszállítói SKU (product_id) hiányzik.',
      });
      continue;
    }

    let crmSku: string;
    try {
      crmSku = generateInternalSku(
        {
          prefix: cat.skuPrefix,
          totalLength: cat.skuTotalLength,
          padChar: cat.skuPadChar ?? '0',
        },
        supplierSku
      );
    } catch (err) {
      skipped.push({
        row: row.rowNumber,
        field: 'product_id',
        message: err instanceof Error ? err.message : 'CRM SKU generálás sikertelen.',
      });
      continue;
    }

    if (row.legacyCrmSkuHint && row.legacyCrmSkuHint !== crmSku) {
      warnings.push({
        row: row.rowNumber,
        field: 'product_id_SM',
        message: `A product_id_SM („${row.legacyCrmSkuHint}”) nem egyezik a generált CRM SKU-val („${crmSku}”). A generált érték kerül mentésre.`,
      });
    }

    const existing = await Product.findOne({ sku: crmSku }).select('sku supplierSku').lean().exec();
    if (existing && existing.supplierSku && existing.supplierSku !== supplierSku) {
      skipped.push({
        row: row.rowNumber,
        field: 'product_id',
        message: `A CRM SKU „${crmSku}” már létezik más beszállítói SKU-val (${existing.supplierSku}).`,
      });
      continue;
    }

    row.product.sku = crmSku;
    ready.push(row);
  }

  return { ready, skipped, warnings };
}

/** Ellenőrzi, hogy minden sor CRM slug-ja létező Category rekordra mutat. */
export async function validateImportCategorySlugs(parsed: ParseResult): Promise<ParseIssue[]> {
  if (parsed.rows.length === 0) return [];

  await connectDB();
  const slugs = [...new Set(parsed.rows.map((r) => r.crmCategorySlug))];
  const found = await Category.find({ slug: { $in: slugs } })
    .select('slug')
    .lean()
    .exec();
  const foundSet = new Set(found.map((c) => c.slug));

  const issues: ParseIssue[] = [];
  for (const row of parsed.rows) {
    if (!foundSet.has(row.crmCategorySlug)) {
      issues.push({
        row: row.rowNumber,
        field: 'crm_category_slug',
        message: `Ismeretlen CRM kategória slug: „${row.crmCategorySlug}”. Hozza létre a Termékkategóriák menüben.`,
      });
    }
  }
  return issues;
}

/** Soronkénti vagy alapértelmezett beszállító slug — létező Supplier.key */
export async function validateImportSupplierSlugs(
  parsed: ParseResult,
  defaultSupplierKey?: string
): Promise<ParseIssue[]> {
  if (parsed.rows.length === 0) return [];

  await connectDB();
  const issues: ParseIssue[] = [];
  const keysNeeded = new Set<string>();

  for (const row of parsed.rows) {
    const key = resolveRowSupplierKey(row, defaultSupplierKey);
    if (!key) {
      issues.push({
        row: row.rowNumber,
        field: 'crm_supplier_slug',
        message:
          'Adja meg a crm_supplier_slug oszlopot, vagy válasszon alapértelmezett beszállítót az import ablakban.',
      });
      continue;
    }
    keysNeeded.add(key);
  }

  if (keysNeeded.size === 0) return issues;

  const found = await Supplier.find({ key: { $in: [...keysNeeded] } })
    .select('key')
    .lean()
    .exec();
  const foundSet = new Set(found.map((s) => s.key));

  for (const row of parsed.rows) {
    const key = resolveRowSupplierKey(row, defaultSupplierKey);
    if (key && !foundSet.has(key)) {
      issues.push({
        row: row.rowNumber,
        field: 'crm_supplier_slug',
        message: `Ismeretlen beszállító slug: „${key}”. Hozza létre: Készletkezelés → Beszállítók.`,
      });
    }
  }

  return issues;
}

export async function commitInventoryImport(
  parsed: ParseResult,
  userId: string,
  options?: { defaultSupplierKey?: string }
): Promise<ImportReport> {
  await connectDB();

  let created = 0;
  let updated = 0;
  let stockUpserts = 0;
  const categoryUpserts = 0;
  let warehouseUpserts = 0;
  let componentLinkWarnings = 0;

  const skuToId = new Map<string, Types.ObjectId>();
  const skuToInternalSku = new Map<string, string>();

  const supplierKeys = new Set<string>();
  for (const row of parsed.rows) {
    const key = resolveRowSupplierKey(row, options?.defaultSupplierKey);
    if (key) supplierKeys.add(key);
  }
  const suppliers = await Supplier.find({ key: { $in: [...supplierKeys] } })
    .lean()
    .exec();
  const supplierByKey = new Map(suppliers.map((s) => [s.key, s]));

  const slugList = [...new Set(parsed.rows.map((r) => r.crmCategorySlug))];
  const categories = await Category.find({ slug: { $in: slugList } })
    .lean()
    .exec();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  // First pass: upsert products
  for (const row of parsed.rows) {
    const supplierKey = resolveRowSupplierKey(row, options?.defaultSupplierKey);
    const supplier = supplierKey ? supplierByKey.get(supplierKey) : undefined;
    if (!supplier) {
      throw new Error(`Missing supplier for key: ${supplierKey ?? '(none)'}`);
    }
    const supplierId = String(supplier._id);

    const chosenCategory = categoryBySlug.get(row.crmCategorySlug);
    if (!chosenCategory) {
      throw new Error(`Missing CRM category for slug: ${row.crmCategorySlug}`);
    }
    const chosenCategoryId = String(chosenCategory._id);

    const crmSku = row.product.sku;

    const doc = await Product.findOne({ sku: crmSku }).exec();
    if (!doc) {
      const createdDoc = await Product.create({
        sku: crmSku,
        internalSku: crmSku,
        supplierSku: row.product.supplierSku,
        supplierNo: row.product.supplierNo,
        supplierId,
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
        categoryIds: [chosenCategoryId],
        shipperCategoryPath: row.product.shipperCategoryPath,
        components: [],
        inCategories: row.product.inCategories,
        isDiscontinued: row.product.isDiscontinued ?? false,
        isActive: true,
        owner: row.product.owner,
        rental: row.product.rental,
        discounts: row.product.discounts,
      });
      created++;
      skuToId.set(crmSku, createdDoc._id);
      skuToInternalSku.set(crmSku, crmSku);
    } else {
      doc.set({
        internalSku: crmSku,
        supplierSku: row.product.supplierSku,
        supplierNo: row.product.supplierNo,
        supplierId,
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
        categoryIds: [chosenCategoryId],
        shipperCategoryPath: row.product.shipperCategoryPath,
        inCategories: row.product.inCategories,
        isDiscontinued: row.product.isDiscontinued ?? false,
        owner: row.product.owner,
        rental: row.product.rental,
        discounts: row.product.discounts,
        isActive: true,
      });
      await doc.save();
      updated++;
      skuToId.set(crmSku, doc._id);
      skuToInternalSku.set(crmSku, crmSku);
    }
  }

  // Second pass: link components (BOM) — componentSkus reference CRM SKU of components
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
    skipped: 0,
    skippedIssues: [],
  };
}
