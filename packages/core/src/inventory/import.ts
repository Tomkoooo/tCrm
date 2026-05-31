import {
  connectDB,
  Category,
  Product,
  StockAdjustment,
  StockLevel,
  Supplier,
  Warehouse,
} from '@crm/db';
import {
  inventoryImportRowSchema,
  parseCrmWarehouseSlugList,
  productSchema,
  skuSchema,
} from '@crm/lib/validation';
import type { ProductInput } from '@crm/lib/validation';
import mongoose, { type Types } from 'mongoose';
import { INVENTORY_COLUMNS } from './excel-columns';
import {
  preprocessImportRows,
  readImportSheetRows,
  normalizeImportSlug,
  type ImportParseConfig,
} from './import-config';
import { deriveSupplierSkuFromSm, generateInternalSku } from './sku';
import { filterFileMediaIds, resolveLinkUrlsToMediaIds, syncMediaUsage } from './media';
import { syncProductWarehouseIds } from './sync-warehouse-ids';
import { warehouseKeyFromExcelColumn, warehouseKeysFromStockColumns } from './warehouse-columns';

export type ParseIssue = { row: number; field?: string; message: string };

export type ParsedInventoryRow = {
  rowNumber: number;
  crmCategorySlug: string;
  /** Per-row supplier key from Excel; falls back to import default when omitted */
  crmSupplierSlug?: string;
  /** Per-row warehouse keys; falls back to import default when omitted */
  crmWarehouseSlugs?: string[];
  /** Optional product_id_SM from file — validated against generated CRM SKU */
  importedSmSku?: string;
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

export function resolveRowWarehouseKeys(row: ParsedInventoryRow): string[] {
  return warehouseKeysFromStockColumns(row.warehouses);
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

function parseConsumableFlag(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value === 1;
  const s = String(value).trim().toLowerCase();
  if (!s || s === '-' || s === '0' || s === 'false' || s === 'nem' || s === 'no') {
    return false;
  }
  return ['1', 'true', 'yes', 'igen', 'i', 'y', 'consumable', 'fogyó'].includes(s);
}

function toStringClean(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  if (!s || s === '-') return undefined;
  return s;
}

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseInventoryRows(
  raw: Record<string, unknown>[],
  parseOptions?: Pick<ImportParseConfig, 'skuMode'>
): ParseResult {
  const skuMode = parseOptions?.skuMode ?? 'from_supplier_sku';
  const errors: ParseIssue[] = [];
  const warnings: ParseIssue[] = [];
  const rows: ParsedInventoryRow[] = [];

  raw.forEach((r, idx) => {
    const rowNumber = idx + 2; // header row is 1

    const supplierSkuRaw = toStringClean(r['product_id']);
    const importedSm = toStringClean(r['product_id_SM']);

    if (skuMode === 'from_sm') {
      if (!importedSm) {
        errors.push({
          row: rowNumber,
          field: 'product_id_SM',
          message: 'CRM SKU kötelező (product_id_SM oszlop) SM import módban.',
        });
        return;
      }
    } else if (!supplierSkuRaw) {
      errors.push({
        row: rowNumber,
        field: 'product_id',
        message: 'Beszállítói SKU kötelező (product_id oszlop).',
      });
      return;
    }

    const skuForSchema = skuMode === 'from_sm' ? importedSm! : (importedSm ?? supplierSkuRaw!);
    const skuParsed = skuSchema.safeParse(skuForSchema);
    if (!skuParsed.success) {
      errors.push({
        row: rowNumber,
        field: importedSm ? 'product_id_SM' : 'product_id',
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

    const crmSlugRaw = toStringClean(r['crm_category_slug']) ?? toStringClean(r['brand']);
    if (!crmSlugRaw) {
      errors.push({
        row: rowNumber,
        field: 'crm_category_slug',
        message: 'CRM kategória slug kötelező (crm_category_slug vagy brand oszlop).',
      });
      return;
    }
    const crmCategorySlug = normalizeImportSlug(crmSlugRaw);
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
      crmSupplierSlug = normalizeImportSlug(supplierSlugRaw);
      if (!SLUG_PATTERN.test(crmSupplierSlug)) {
        errors.push({
          row: rowNumber,
          field: 'crm_supplier_slug',
          message: 'Érvénytelen beszállító slug formátum (crm_supplier_slug).',
        });
        return;
      }
    }

    const warehouseSlugRaw = toStringClean(r['crm_warehouse_slug']);
    let crmWarehouseSlugs: string[] | undefined;
    if (warehouseSlugRaw) {
      try {
        crmWarehouseSlugs = parseCrmWarehouseSlugList(warehouseSlugRaw);
      } catch {
        errors.push({
          row: rowNumber,
          field: 'crm_warehouse_slug',
          message: 'Érvénytelen raktár slug (crm_warehouse_slug) — vesszővel több is megadható.',
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

    const names = {
      de: toStringClean(r['name_de']),
      en: toStringClean(r['name_en']),
      hu: toStringClean(r['name_hu']),
    };
    if (!names.de && !names.en && !names.hu) {
      names.en = supplierSkuRaw ?? importedSm ?? 'product';
    }

    const productCandidate: ProductInput = {
      sku: skuParsed.data,
      supplierSku: supplierSkuRaw ?? undefined,
      supplierNo: toStringClean(r['supplierNo']),
      brand: toStringClean(r['brand']),
      ean: toStringClean(r['ean']),
      names,
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
      isConsumable: parseConsumableFlag(r['is_consumable']),
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
      warehouseIds: [],
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
    for (const key of Object.keys(r)) {
      if (!(INVENTORY_COLUMNS as readonly string[]).includes(key)) {
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
      crmWarehouseSlugs,
      importedSmSku: importedSm,
      product: validated.data,
      warehouses,
      componentSkus,
    });

    if (crmWarehouseSlugs?.length && Object.keys(warehouses).length === 0) {
      warnings.push({
        row: rowNumber,
        field: 'crm_warehouse_slug',
        message:
          'A crm_warehouse_slug oszlop figyelmen kívül marad — raktár jelenlét csak a warehouse 1./2./3. készlet oszlopokból származik.',
      });
    }
  });

  return { rows, errors, warnings };
}

export async function parseInventoryXlsx(
  buffer: ArrayBuffer,
  options?: ImportParseConfig
): Promise<ParseResult> {
  const { rows: rawRows } = readImportSheetRows(buffer, options?.sheetName);
  const preprocessed = preprocessImportRows(rawRows, options ?? {});
  return parseInventoryRows(preprocessed, options);
}

export type ImportMatchKey = 'sku' | 'supplierSku' | 'ean';

export type ImportMergeField =
  | 'names'
  | 'descriptions'
  | 'colors'
  | 'pricing'
  | 'dimensions'
  | 'images'
  | 'categories'
  | 'warehouses'
  | 'components'
  | 'stock';

export type ImportMergeOptions = {
  matchKey?: ImportMatchKey;
  /** When true, existing products are updated with merge rules instead of full replace. */
  isMerge?: boolean;
  /** Empty = all mergeable fields except components/stock. */
  mergeFields?: ImportMergeField[];
} & ImportParseConfig;

export type ImportCommitOptions = ImportMergeOptions &
  ImportParseConfig & {
    defaultSupplierKey?: string;
  };

const DEFAULT_MERGE_FIELDS: ImportMergeField[] = [
  'names',
  'descriptions',
  'colors',
  'pricing',
  'dimensions',
  'images',
  'categories',
];

type I18nLike = { de?: string; en?: string; hu?: string };

function mergeI18nText(existing: I18nLike | undefined, incoming: I18nLike | undefined): I18nLike {
  return {
    de: incoming?.de ?? existing?.de,
    en: incoming?.en ?? existing?.en,
    hu: incoming?.hu ?? existing?.hu,
  };
}

function mergeFieldEnabled(
  isMerge: boolean,
  mergeFields: ImportMergeField[] | undefined,
  field: ImportMergeField
): boolean {
  if (!isMerge) return true;
  const fields = mergeFields?.length ? mergeFields : DEFAULT_MERGE_FIELDS;
  return fields.includes(field);
}

async function findExistingProductForImportRow(
  row: ParsedInventoryRow,
  crmSku: string,
  supplierId: string,
  matchKey: ImportMatchKey
) {
  if (matchKey === 'sku') {
    return Product.findOne({ sku: crmSku }).select('sku supplierSku').lean().exec();
  }

  if (matchKey === 'supplierSku') {
    const supplierSku = row.product.supplierSku?.trim();
    if (!supplierSku) return null;
    return (
      (await Product.findOne({ supplierSku, supplierId })
        .select('sku supplierSku')
        .lean()
        .exec()) ?? (await Product.findOne({ supplierSku }).select('sku supplierSku').lean().exec())
    );
  }

  const ean = row.product.ean?.trim();
  if (!ean) return null;
  return Product.findOne({ ean }).select('sku supplierSku').lean().exec();
}

async function resolveComponentProductId(
  sku: string,
  skuToId: Map<string, Types.ObjectId>
): Promise<Types.ObjectId | undefined> {
  const fromBatch = skuToId.get(sku);
  if (fromBatch) return fromBatch;

  const existing = await Product.findOne({ sku }).select('_id').lean().exec();
  if (!existing) return undefined;

  const id = existing._id as Types.ObjectId;
  skuToId.set(sku, id);
  return id;
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
  const mapped = warehouseKeyFromExcelColumn(columnName);
  if (mapped) {
    const wh = await Warehouse.findOneAndUpdate(
      { key: mapped },
      {
        $setOnInsert: {
          key: mapped,
          name:
            mapped === 'kispest'
              ? 'Kispest raktár'
              : mapped === 'erzsebet'
                ? 'Erzsébet raktár'
                : 'Récsei Raktár',
          isActive: true,
        },
      },
      { upsert: true, new: true }
    ).exec();
    return wh._id;
  }
  const map: Record<string, { key: string; name: string }> = {
    'warehouse 1.': { key: 'kispest', name: 'Kispest raktár' },
    'warehouse 2.': { key: 'erzsebet', name: 'Erzsébet raktár' },
    'warehouse 3.': { key: 'recsei', name: 'Récsei Raktár' },
  };
  const info = map[columnName] ?? { key: slugifyKey(columnName), name: columnName };
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
  defaultSupplierKey?: string,
  mergeOptions?: ImportMergeOptions
): Promise<PrepareImportResult> {
  await connectDB();

  const matchKey = mergeOptions?.matchKey ?? 'sku';
  const allowMissingSupplier = mergeOptions?.allowMissingSupplier ?? false;
  const skuMode = mergeOptions?.skuMode ?? 'from_supplier_sku';
  const supplierSkuCut = mergeOptions?.supplierSkuCut;

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
    if (!supplierKey && !allowMissingSupplier) {
      skipped.push({
        row: row.rowNumber,
        field: 'crm_supplier_slug',
        message:
          'Adja meg a crm_supplier_slug oszlopot, vagy válasszon alapértelmezett beszállítót az import ablakban.',
      });
      continue;
    }
    if (supplierKey && !supplierByKey.has(supplierKey)) {
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

    const skuSettings = {
      prefix: cat.skuPrefix,
      totalLength: cat.skuTotalLength,
      padChar: cat.skuPadChar ?? '0',
    };

    let crmSku: string;
    let supplierSku: string;

    if (skuMode === 'from_sm') {
      const sm = row.importedSmSku?.trim();
      if (!sm) {
        skipped.push({
          row: row.rowNumber,
          field: 'product_id_SM',
          message: 'CRM SKU (product_id_SM) hiányzik.',
        });
        continue;
      }

      try {
        supplierSku = deriveSupplierSkuFromSm(skuSettings, sm, supplierSkuCut);
        crmSku = sm;
        row.product.supplierSku = supplierSku;

        const generated = generateInternalSku(skuSettings, supplierSku);
        if (generated !== sm) {
          warnings.push({
            row: row.rowNumber,
            field: 'product_id_SM',
            message: `Az SM SKU („${sm}”) nem egyezik a beszállítói SKU-ból generált CRM SKU-val („${generated}”). Az SM érték kerül mentésre.`,
          });
        }
      } catch (err) {
        skipped.push({
          row: row.rowNumber,
          field: 'product_id_SM',
          message: err instanceof Error ? err.message : 'Beszállítói SKU kinyerése sikertelen.',
        });
        continue;
      }
    } else {
      supplierSku = row.product.supplierSku?.trim() ?? '';
      if (!supplierSku) {
        skipped.push({
          row: row.rowNumber,
          field: 'product_id',
          message: 'Beszállítói SKU (product_id) hiányzik.',
        });
        continue;
      }

      try {
        const generated = generateInternalSku(skuSettings, supplierSku);
        crmSku = generated;
        if (row.importedSmSku && row.importedSmSku !== crmSku) {
          warnings.push({
            row: row.rowNumber,
            field: 'product_id_SM',
            message: `A product_id_SM („${row.importedSmSku}”) nem egyezik a generált CRM SKU-val („${crmSku}”). A generált érték kerül mentésre.`,
          });
        }
      } catch (err) {
        skipped.push({
          row: row.rowNumber,
          field: 'product_id',
          message: err instanceof Error ? err.message : 'CRM SKU generálás sikertelen.',
        });
        continue;
      }
    }

    const supplierId = supplierKey ? String(supplierByKey.get(supplierKey)!._id) : '';
    const existing = await findExistingProductForImportRow(row, crmSku, supplierId, matchKey);

    if (
      existing &&
      matchKey === 'sku' &&
      existing.supplierSku &&
      existing.supplierSku !== supplierSku
    ) {
      skipped.push({
        row: row.rowNumber,
        field: 'product_id',
        message: `A CRM SKU „${crmSku}” már létezik más beszállítói SKU-val (${existing.supplierSku}).`,
      });
      continue;
    }

    if (existing && matchKey !== 'sku' && !existing.sku) {
      skipped.push({
        row: row.rowNumber,
        field: matchKey,
        message: `Meglévő termék található, de hiányzik a CRM SKU.`,
      });
      continue;
    }

    row.product.sku = existing?.sku ?? crmSku;
    if (existing && matchKey !== 'sku') {
      warnings.push({
        row: row.rowNumber,
        field: matchKey,
        message: `Meglévő termék található (${matchKey}): „${existing.sku}” — frissítés erre a CRM SKU-ra.`,
      });
    }
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
  options?: ImportCommitOptions
): Promise<ImportReport> {
  await connectDB();

  const isMerge = options?.isMerge ?? false;
  const mergeFields = options?.mergeFields;

  let created = 0;
  let updated = 0;
  let stockUpserts = 0;
  const categoryUpserts = 0;
  let warehouseUpserts = 0;
  let componentLinkWarnings = 0;
  const createdSkus = new Set<string>();

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
    if (!supplier && !options?.allowMissingSupplier) {
      throw new Error(`Missing supplier for key: ${supplierKey ?? '(none)'}`);
    }
    const supplierId = supplier ? String(supplier._id) : undefined;

    const chosenCategory = categoryBySlug.get(row.crmCategorySlug);
    if (!chosenCategory) {
      throw new Error(`Missing CRM category for slug: ${row.crmCategorySlug}`);
    }
    const chosenCategoryId = String(chosenCategory._id);

    const crmSku = row.product.sku;

    const bildUrls = (row.product.externalImageHints ?? []).filter((h) => h?.trim());
    const importLinkMediaIds = await resolveLinkUrlsToMediaIds(bildUrls);

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
        externalImageHints: bildUrls,
        imageIds: importLinkMediaIds.map((id) => new mongoose.Types.ObjectId(id)),
        freightLevel: row.product.freightLevel,
        stockLevelHint: row.product.stockLevelHint,
        availabilityWeeks: row.product.availabilityWeeks,
        categoryIds: [chosenCategoryId],
        warehouseIds: [],
        shipperCategoryPath: row.product.shipperCategoryPath,
        components: [],
        inCategories: row.product.inCategories,
        isDiscontinued: row.product.isDiscontinued ?? false,
        isConsumable: row.product.isConsumable ?? false,
        isActive: true,
        owner: row.product.owner,
        rental: row.product.rental,
        discounts: row.product.discounts,
      });
      created++;
      createdSkus.add(crmSku);
      skuToId.set(crmSku, createdDoc._id);
      skuToInternalSku.set(crmSku, crmSku);

      if (importLinkMediaIds.length > 0) {
        await syncMediaUsage({
          entityType: 'product',
          entityId: createdDoc._id,
          previousMediaIds: [],
          nextMediaIds: importLinkMediaIds,
        });
      }
    } else {
      const previousMediaIds = (doc.imageIds ?? []).map((id) => id.toString());
      const keptFileIds = await filterFileMediaIds(doc.imageIds ?? []);
      const nextMediaIds = [...keptFileIds, ...importLinkMediaIds];

      if (isMerge) {
        const patch: Record<string, unknown> = {
          supplierSku: row.product.supplierSku ?? doc.supplierSku,
          supplierNo: row.product.supplierNo ?? doc.supplierNo,
          supplierId,
          brand: row.product.brand ?? doc.brand,
          ean: row.product.ean ?? doc.ean,
          freightLevel: row.product.freightLevel ?? doc.freightLevel,
          stockLevelHint: row.product.stockLevelHint ?? doc.stockLevelHint,
          availabilityWeeks: row.product.availabilityWeeks ?? doc.availabilityWeeks,
          inCategories: row.product.inCategories ?? doc.inCategories,
          owner: row.product.owner ?? doc.owner,
          rental: row.product.rental ?? doc.rental,
          discounts: row.product.discounts ?? doc.discounts,
          isDiscontinued: row.product.isDiscontinued ?? doc.isDiscontinued,
          isConsumable: row.product.isConsumable ?? doc.isConsumable,
          shipperCategoryPath: row.product.shipperCategoryPath ?? doc.shipperCategoryPath,
          youtubeId: row.product.youtubeId ?? doc.youtubeId,
          youtubeVideo: row.product.youtubeVideo ?? doc.youtubeVideo,
        };

        if (mergeFieldEnabled(isMerge, mergeFields, 'names')) {
          patch.names = mergeI18nText(doc.names, row.product.names);
        }
        if (mergeFieldEnabled(isMerge, mergeFields, 'descriptions')) {
          patch.descriptions = mergeI18nText(doc.descriptions, row.product.descriptions);
        }
        if (mergeFieldEnabled(isMerge, mergeFields, 'colors')) {
          patch.colors = mergeI18nText(doc.colors, row.product.colors);
        }
        if (mergeFieldEnabled(isMerge, mergeFields, 'pricing')) {
          patch.pricing = { ...(doc.pricing ?? {}), ...(row.product.pricing ?? {}) };
        }
        if (mergeFieldEnabled(isMerge, mergeFields, 'dimensions')) {
          patch.dimensionsMm = { ...(doc.dimensionsMm ?? {}), ...(row.product.dimensionsMm ?? {}) };
          patch.weightKg = row.product.weightKg ?? doc.weightKg;
          patch.packageWeightKg = row.product.packageWeightKg ?? doc.packageWeightKg;
          patch.packageVolumeM3 = row.product.packageVolumeM3 ?? doc.packageVolumeM3;
        }
        if (mergeFieldEnabled(isMerge, mergeFields, 'images')) {
          patch.externalImageHints = bildUrls.length ? bildUrls : doc.externalImageHints;
          patch.imageIds = nextMediaIds.map((id) => new mongoose.Types.ObjectId(id));
        }
        if (mergeFieldEnabled(isMerge, mergeFields, 'categories')) {
          patch.categoryIds = [chosenCategoryId];
        }

        doc.set(patch);
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
          externalImageHints: bildUrls,
          imageIds: nextMediaIds.map((id) => new mongoose.Types.ObjectId(id)),
          freightLevel: row.product.freightLevel,
          stockLevelHint: row.product.stockLevelHint,
          availabilityWeeks: row.product.availabilityWeeks,
          categoryIds: [chosenCategoryId],
          shipperCategoryPath: row.product.shipperCategoryPath,
          inCategories: row.product.inCategories,
          isDiscontinued: row.product.isDiscontinued ?? false,
          isConsumable: row.product.isConsumable ?? false,
          owner: row.product.owner,
          rental: row.product.rental,
          discounts: row.product.discounts,
          isActive: true,
        });
      }

      await doc.save();
      updated++;
      skuToId.set(crmSku, doc._id);
      skuToInternalSku.set(crmSku, crmSku);

      if (mergeFieldEnabled(isMerge, mergeFields, 'images') || !isMerge) {
        await syncMediaUsage({
          entityType: 'product',
          entityId: doc._id,
          previousMediaIds,
          nextMediaIds:
            mergeFieldEnabled(isMerge, mergeFields, 'images') || !isMerge
              ? nextMediaIds
              : previousMediaIds,
        });
      }
    }
  }

  const shouldLinkComponents = !isMerge || mergeFieldEnabled(isMerge, mergeFields, 'components');

  // Second pass: link components (BOM) — componentSkus reference CRM SKU of components
  for (const row of parsed.rows) {
    if (!createdSkus.has(row.product.sku) && !shouldLinkComponents) continue;

    const productId = skuToId.get(row.product.sku);
    if (!productId) continue;

    const componentRefs: Array<{ productId: Types.ObjectId; quantity: number }> = [];
    for (const c of row.componentSkus) {
      const compId = await resolveComponentProductId(c.sku, skuToId);
      if (!compId) {
        componentLinkWarnings++;
        continue;
      }
      componentRefs.push({ productId: compId, quantity: c.quantity });
    }

    await Product.updateOne({ _id: productId }, { $set: { components: componentRefs } }).exec();
  }

  const shouldUpdateStock = !isMerge || mergeFieldEnabled(isMerge, mergeFields, 'stock');

  // Stock levels + adjustments for initial load
  for (const row of parsed.rows) {
    if (!createdSkus.has(row.product.sku) && !shouldUpdateStock) continue;

    const productId = skuToId.get(row.product.sku);
    if (!productId) continue;

    for (const [colName, qty] of Object.entries(row.warehouses)) {
      const warehouseId = await upsertWarehouseByColumn(colName);
      warehouseUpserts++;

      const existingStock = await StockLevel.findOne({ productId, warehouseId })
        .select('onHand')
        .lean()
        .exec();
      const previousOnHand = existingStock?.onHand ?? 0;

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

      const delta = qty - previousOnHand;
      if (delta !== 0) {
        await StockAdjustment.create({
          productId,
          warehouseId,
          delta,
          reason: 'initial_load',
          note: 'Initial load from Excel import',
          byUserId: userId,
          at: new Date(),
        });
      }
    }

    await syncProductWarehouseIds(productId);
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
