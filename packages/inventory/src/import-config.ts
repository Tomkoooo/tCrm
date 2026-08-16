import * as XLSX from 'xlsx';
import { INVENTORY_COLUMNS } from './excel-columns';

export type ImportCanonicalField = (typeof INVENTORY_COLUMNS)[number];

export type ImportColumnMap = Partial<Record<ImportCanonicalField, string | null>>;

export type ImportSkuMode = 'from_supplier_sku' | 'from_sm';

export type SupplierSkuCutConfig = {
  /** Beszállítói SKU hossza — ennyi számjegy az SM SKU végéről */
  supplierSkuLength?: number;
  /** @deprecated use supplierSkuLength */
  digitCount?: number;
  /** @deprecated ignored */
  stripCategoryPrefix?: boolean;
};

export type ImportParseConfig = {
  sheetName?: string;
  columnMap?: ImportColumnMap;
  allowMissingSupplier?: boolean;
  /** Default: derive CRM SKU from product_id using category prefix */
  skuMode?: ImportSkuMode;
  supplierSkuCut?: SupplierSkuCutConfig;
};

export type ImportWorkbookInspect = {
  sheetNames: string[];
  headersBySheet: Record<string, string[]>;
  sampleRowsBySheet: Record<string, Record<string, unknown>[]>;
};

export type ImportCanonicalFieldMeta = {
  key: ImportCanonicalField;
  labelHu: string;
  required: boolean;
  crmOnly?: boolean;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Lowercase slug; slugify when the value is not already a valid slug (e.g. "ALUTENT" → "alutent"). */
export function normalizeImportSlug(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (SLUG_PATTERN.test(lower)) return lower;
  return slugify(trimmed);
}

function headerMatches(headers: string[], source: string): boolean {
  const lower = source.toLowerCase();
  return headers.some((h) => h.toLowerCase() === lower);
}

function canonicalForHeader(header: string): ImportCanonicalField | undefined {
  return (INVENTORY_COLUMNS as readonly string[]).find(
    (c) => c.toLowerCase() === header.toLowerCase()
  ) as ImportCanonicalField | undefined;
}

const CANONICAL_FIELD_META: ImportCanonicalFieldMeta[] = [
  { key: 'product_id', labelHu: 'Beszállítói azonosító', required: true },
  { key: 'product_id_SM', labelHu: 'CRM SKU (SM)', required: false },
  { key: 'crm_category_slug', labelHu: 'CRM kategória slug', required: true, crmOnly: true },
  { key: 'crm_supplier_slug', labelHu: 'CRM beszállító slug', required: false, crmOnly: true },
  { key: 'crm_warehouse_slug', labelHu: 'CRM raktár slug', required: false, crmOnly: true },
  { key: 'brand', labelHu: 'Márka', required: false },
  { key: 'name_hu', labelHu: 'Magyar megnevezés', required: false },
  { key: 'name_en', labelHu: 'Angol megnevezés', required: false },
  { key: 'name_de', labelHu: 'Német megnevezés', required: false },
  { key: 'Relatedproduct_1', labelHu: 'Kapcsolódó termék 1 (BOM)', required: false },
];

export function listImportCanonicalFields(): ImportCanonicalFieldMeta[] {
  const metaKeys = new Set(CANONICAL_FIELD_META.map((m) => m.key));
  const extras: ImportCanonicalFieldMeta[] = INVENTORY_COLUMNS.filter((k) => !metaKeys.has(k)).map(
    (key) => ({
      key,
      labelHu: key,
      required: false,
    })
  );
  return [...CANONICAL_FIELD_META, ...extras];
}

function toStringClean(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  if (!s || s === '-') return undefined;
  return s;
}

function applyColumnMap(
  row: Record<string, unknown>,
  columnMap?: ImportColumnMap
): Record<string, unknown> {
  if (!columnMap) return { ...row };

  const out = { ...row };
  for (const [canonical, sourceColumn] of Object.entries(columnMap)) {
    if (!sourceColumn) continue;
    if (Object.prototype.hasOwnProperty.call(row, sourceColumn)) {
      out[canonical] = row[sourceColumn];
    }
  }
  return out;
}

export function buildAutoColumnMap(headers: string[]): ImportColumnMap {
  const map: ImportColumnMap = {};
  for (const canonical of INVENTORY_COLUMNS) {
    const match = headers.find((h) => h.toLowerCase() === canonical.toLowerCase());
    if (match) {
      map[canonical] = match;
    }
  }
  return map;
}

export function detectImportGaps(
  headers: string[],
  columnMap?: ImportColumnMap,
  options?: Pick<ImportParseConfig, 'skuMode'>
): string[] {
  const gaps: string[] = [];
  const mappedCanonical = new Set<string>();
  const skuMode = options?.skuMode ?? 'from_supplier_sku';

  if (columnMap) {
    for (const [canonical, source] of Object.entries(columnMap)) {
      if (source && headerMatches(headers, source)) mappedCanonical.add(canonical);
    }
  }
  for (const h of headers) {
    const canonical = canonicalForHeader(h);
    if (canonical) mappedCanonical.add(canonical);
  }

  if (skuMode === 'from_sm') {
    if (!mappedCanonical.has('product_id_SM')) gaps.push('product_id_SM');
  } else if (!mappedCanonical.has('product_id')) {
    gaps.push('product_id');
  }

  if (!mappedCanonical.has('crm_category_slug')) gaps.push('crm_category_slug');

  return gaps;
}

export function readImportWorkbook(buffer: ArrayBuffer): ImportWorkbookInspect {
  const wb = XLSX.read(buffer, { type: 'array' });
  const headersBySheet: Record<string, string[]> = {};
  const sampleRowsBySheet: Record<string, Record<string, unknown>[]> = {};

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    sampleRowsBySheet[sheetName] = raw.slice(0, 3);
    headersBySheet[sheetName] =
      raw.length > 0
        ? Object.keys(raw[0]!)
        : (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] ?? []);
  }

  return { sheetNames: wb.SheetNames, headersBySheet, sampleRowsBySheet };
}

export function readImportSheetRows(
  buffer: ArrayBuffer,
  sheetName?: string
): { sheetName: string; rows: Record<string, unknown>[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const resolvedSheet =
    sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0]!;
  const ws = wb.Sheets[resolvedSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return { sheetName: resolvedSheet, rows };
}

export function preprocessImportRows(
  rawRows: Record<string, unknown>[],
  config: ImportParseConfig
): Record<string, unknown>[] {
  return rawRows.map((rawRow) => {
    const out = applyColumnMap(rawRow, config.columnMap);

    if (!toStringClean(out['crm_category_slug']) && toStringClean(out['brand'])) {
      out['crm_category_slug'] = out['brand'];
    }

    const categoryRaw = toStringClean(out['crm_category_slug']);
    if (categoryRaw) {
      out['crm_category_slug'] = normalizeImportSlug(categoryRaw);
    }

    const supplierSlugRaw = toStringClean(out['crm_supplier_slug']);
    if (supplierSlugRaw) {
      out['crm_supplier_slug'] = normalizeImportSlug(supplierSlugRaw);
    }

    return out;
  });
}
