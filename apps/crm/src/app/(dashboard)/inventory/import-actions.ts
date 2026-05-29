'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requirePermission } from '@crm/auth';
import { commitInventoryImport, parseInventoryXlsx, prepareImportRows } from '@crm/core';
import { connectDB, Supplier, Warehouse } from '@crm/db';

export type ImportIssue = { row: number; field?: string; message: string };

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

export async function previewImportAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requirePermission('inventory:import');

  const defaultSupplierKey =
    String(formData.get('supplierKey') ?? '')
      .trim()
      .toLowerCase() || undefined;
  const defaultWarehouseKey =
    String(formData.get('warehouseKey') ?? '')
      .trim()
      .toLowerCase() || undefined;

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, message: 'Hiányzik a fájl.' };
  }

  await connectDB();
  if (defaultSupplierKey) {
    const supplier = await Supplier.findOne({ key: defaultSupplierKey }).lean().exec();
    if (!supplier) {
      return { success: false, message: `Beszállító nem található: ${defaultSupplierKey}` };
    }
  }
  if (defaultWarehouseKey) {
    const warehouse = await Warehouse.findOne({ key: defaultWarehouseKey }).lean().exec();
    if (!warehouse) {
      return { success: false, message: `Raktár nem található: ${defaultWarehouseKey}` };
    }
  }

  const buf = await file.arrayBuffer();
  const parsed = parseInventoryXlsx(buf);
  const prepared = await prepareImportRows(parsed, defaultSupplierKey, defaultWarehouseKey);

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
      supplierKey: defaultSupplierKey,
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
    supplierKey: defaultSupplierKey,
  };
}

export async function commitImportAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requirePermission('inventory:import');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };

  const defaultSupplierKey =
    String(formData.get('supplierKey') ?? '')
      .trim()
      .toLowerCase() || undefined;
  const defaultWarehouseKey =
    String(formData.get('warehouseKey') ?? '')
      .trim()
      .toLowerCase() || undefined;

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, message: 'Hiányzik a fájl.' };
  }

  await connectDB();
  if (defaultSupplierKey) {
    const supplier = await Supplier.findOne({ key: defaultSupplierKey }).lean().exec();
    if (!supplier) {
      return { success: false, message: `Beszállító nem található: ${defaultSupplierKey}` };
    }
  }
  if (defaultWarehouseKey) {
    const warehouse = await Warehouse.findOne({ key: defaultWarehouseKey }).lean().exec();
    if (!warehouse) {
      return { success: false, message: `Raktár nem található: ${defaultWarehouseKey}` };
    }
  }

  const buf = await file.arrayBuffer();
  const parsed = parseInventoryXlsx(buf);
  const prepared = await prepareImportRows(parsed, defaultSupplierKey, defaultWarehouseKey);

  if (prepared.ready.length === 0) {
    return {
      success: false,
      message: `Nincs importálható sor (${prepared.skipped.length} kihagyva).`,
    };
  }

  const report = await commitInventoryImport(
    { rows: prepared.ready, errors: [], warnings: prepared.warnings },
    user.id,
    { defaultSupplierKey, defaultWarehouseKey }
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
    supplierKey: defaultSupplierKey,
  };
}
