'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requirePermission } from '@crm/auth';
import {
  buildAutoColumnMap,
  commitInventoryImport,
  detectImportGaps,
  parseInventoryXlsx,
  prepareImportRows,
  readImportWorkbook,
  type ImportColumnMap,
  type ImportCommitOptions,
  type ImportMatchKey,
  type ImportMergeField,
  type ImportParseConfig,
} from '@crm/inventory';
import { connectDB, Supplier } from '@crm/db-core';
import {
  importMatchKeySchema,
  parseImportConfigJson,
  parseImportMergeFieldsJson,
} from '@crm/lib/validation';

export type ImportIssue = { row: number; field?: string; message: string };

export type ImportInspectResult =
  | { success: false; message: string }
  | {
      success: true;
      sheetNames: string[];
      headers: string[];
      gaps: string[];
      suggestedSheet?: string;
      suggestedColumnMap?: ImportColumnMap;
    };

export type ImportState =
  | { success: false; message: string }
  | {
      success: true;
      message: string;
      preview?: {
        importable: number;
        skipped: number;
        warnings: number;
        skippedIssues?: ImportIssue[];
        warningSamples?: ImportIssue[];
      };
      report?: {
        created: number;
        updated: number;
        stockUpserts: number;
        warehouseUpserts: number;
        componentLinkWarnings: number;
        skipped: number;
        skippedIssues?: ImportIssue[];
      };
      supplierKey?: string;
    };

function parseImportOptions(formData: FormData): ImportCommitOptions {
  const defaultSupplierKey =
    String(formData.get('supplierKey') ?? '')
      .trim()
      .toLowerCase() || undefined;

  const matchKeyRaw = String(formData.get('matchKey') ?? 'sku').trim();
  const matchKeyParsed = importMatchKeySchema.safeParse(matchKeyRaw);
  const matchKey: ImportMatchKey = matchKeyParsed.success ? matchKeyParsed.data : 'sku';

  const isMerge = formData.get('isMerge') === 'true';
  const mergeFields = parseImportMergeFieldsJson(String(formData.get('mergeFieldsJson') ?? ''));
  const importConfig = parseImportConfigJson(
    String(formData.get('importConfigJson') ?? '')
  ) as ImportParseConfig;

  return {
    defaultSupplierKey,
    matchKey,
    isMerge,
    mergeFields: mergeFields.length ? (mergeFields as ImportMergeField[]) : undefined,
    ...importConfig,
  };
}

export async function inspectImportFileAction(formData: FormData): Promise<ImportInspectResult> {
  await requirePermission('inventory:import');

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, message: 'Hiányzik a fájl.' };
  }

  const buf = await file.arrayBuffer();
  const workbook = readImportWorkbook(buf);
  const preferredSheet = workbook.sheetNames[0];
  const headers = preferredSheet ? (workbook.headersBySheet[preferredSheet] ?? []) : [];
  const suggestedColumnMap = buildAutoColumnMap(headers);
  const gaps = detectImportGaps(headers, suggestedColumnMap);

  return {
    success: true,
    sheetNames: workbook.sheetNames,
    headers,
    gaps,
    suggestedSheet: preferredSheet,
    suggestedColumnMap,
  };
}

async function validateImportDefaults(options: ImportCommitOptions) {
  if (options.defaultSupplierKey) {
    const supplier = await Supplier.findOne({ key: options.defaultSupplierKey }).lean().exec();
    if (!supplier) {
      return `Beszállító nem található: ${options.defaultSupplierKey}`;
    }
  }
  return null;
}

export async function previewImportAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requirePermission('inventory:import');

  const options = parseImportOptions(formData);

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, message: 'Hiányzik a fájl.' };
  }

  await connectDB();
  const validationError = await validateImportDefaults(options);
  if (validationError) return { success: false, message: validationError };

  const buf = await file.arrayBuffer();
  const parsed = await parseInventoryXlsx(buf, options);
  const prepared = await prepareImportRows(parsed, options.defaultSupplierKey, options);

  const importable = prepared.ready.length;
  const skipped = prepared.skipped.length;

  if (importable === 0) {
    return {
      success: true,
      message: 'Egyetlen sor sem importálható. Javítsa a hibákat az alábbi lista alapján.',
      preview: {
        importable: 0,
        skipped,
        warnings: prepared.warnings.length,
        skippedIssues: prepared.skipped,
        warningSamples: prepared.warnings.slice(0, 20),
      },
      supplierKey: options.defaultSupplierKey,
    };
  }

  return {
    success: true,
    message:
      skipped > 0
        ? `${importable} sor importálható, ${skipped} kihagyva. Mentés után a kihagyott sorok listája is megjelenik.`
        : `${importable} sor importálható. Mentésre kész.`,
    preview: {
      importable,
      skipped,
      warnings: prepared.warnings.length,
      skippedIssues: prepared.skipped,
      warningSamples: prepared.warnings.slice(0, 20),
    },
    supplierKey: options.defaultSupplierKey,
  };
}

export async function commitImportAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requirePermission('inventory:import');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };

  const options = parseImportOptions(formData);

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, message: 'Hiányzik a fájl.' };
  }

  await connectDB();
  const validationError = await validateImportDefaults(options);
  if (validationError) return { success: false, message: validationError };

  const buf = await file.arrayBuffer();
  const parsed = await parseInventoryXlsx(buf, options);
  const prepared = await prepareImportRows(parsed, options.defaultSupplierKey, options);

  if (prepared.ready.length === 0) {
    return {
      success: false,
      message: `Nincs importálható sor (${prepared.skipped.length} kihagyva).`,
    };
  }

  const report = await commitInventoryImport(
    { rows: prepared.ready, errors: [], warnings: prepared.warnings },
    user.id,
    options
  );

  revalidatePath('/inventory');
  revalidatePath('/inventory/categories');

  const skippedCount = prepared.skipped.length;
  const base = `Import kész: ${report.created} új, ${report.updated} frissített termék.`;
  const message = skippedCount > 0 ? `${base} ${skippedCount} sor kihagyva (lásd alább).` : base;

  return {
    success: true,
    message,
    report: {
      created: report.created,
      updated: report.updated,
      stockUpserts: report.stockUpserts,
      warehouseUpserts: report.warehouseUpserts,
      componentLinkWarnings: report.componentLinkWarnings,
      skipped: skippedCount,
      skippedIssues: prepared.skipped,
    },
    supplierKey: options.defaultSupplierKey,
  };
}
