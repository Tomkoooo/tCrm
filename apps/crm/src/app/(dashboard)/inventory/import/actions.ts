'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, requirePermission } from '@crm/auth';
import { commitInventoryImport, parseInventoryXlsx } from '@crm/core';
import { connectDB, Category, Supplier } from '@crm/db';

export type ImportState =
  | { success: false; message: string }
  | {
      success: true;
      message: string;
      preview?: {
        rows: number;
        errors: number;
        warnings: number;
      };
      report?: {
        created: number;
        updated: number;
        stockUpserts: number;
        warehouseUpserts: number;
        componentLinkWarnings: number;
      };
      parsed?: string; // JSON string (kept small for Phase 1 demo)
      supplierKey?: string;
      categorySlug?: string;
    };

export async function uploadAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requirePermission('inventory:import');

  const supplierKey = String(formData.get('supplierKey') ?? '')
    .trim()
    .toLowerCase();
  const categorySlug = String(formData.get('categorySlug') ?? '')
    .trim()
    .toLowerCase();
  if (!supplierKey || !categorySlug) {
    return { success: false, message: 'Supplier key and category slug are required.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { success: false, message: 'Missing file.' };
  }

  const buf = await file.arrayBuffer();
  const parsed = parseInventoryXlsx(buf);

  if (parsed.errors.length > 0) {
    return {
      success: true,
      message: 'Parsed with errors. Fix your sheet and retry.',
      preview: {
        rows: parsed.rows.length,
        errors: parsed.errors.length,
        warnings: parsed.warnings.length,
      },
      parsed: JSON.stringify({
        rows: parsed.rows.slice(0, 200),
        errors: parsed.errors,
        warnings: parsed.warnings,
      }),
      supplierKey,
      categorySlug,
    };
  }

  return {
    success: true,
    message: 'Preview ready.',
    preview: {
      rows: parsed.rows.length,
      errors: parsed.errors.length,
      warnings: parsed.warnings.length,
    },
    parsed: JSON.stringify({
      rows: parsed.rows.slice(0, 200),
      errors: parsed.errors,
      warnings: parsed.warnings,
    }),
    supplierKey,
    categorySlug,
  };
}

export async function commitAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requirePermission('inventory:import');
  const user = await requireAuth();
  if (!user) return { success: false, message: 'Not authenticated.' };

  const payload = String(formData.get('parsed') ?? '');
  if (!payload) return { success: false, message: 'Missing preview payload.' };

  const supplierKey = String(formData.get('supplierKey') ?? '')
    .trim()
    .toLowerCase();
  const categorySlug = String(formData.get('categorySlug') ?? '')
    .trim()
    .toLowerCase();
  if (!supplierKey || !categorySlug)
    return { success: false, message: 'Missing supplier/category.' };

  await connectDB();
  const supplier = await Supplier.findOne({ key: supplierKey }).lean().exec();
  if (!supplier) return { success: false, message: `Supplier not found: ${supplierKey}` };
  const category = await Category.findOne({ slug: categorySlug }).lean().exec();
  if (!category) return { success: false, message: `Category not found: ${categorySlug}` };

  const parsed = JSON.parse(payload) as ReturnType<typeof parseInventoryXlsx>;
  const report = await commitInventoryImport(parsed, user.id, {
    supplierId: String(supplier._id),
    categoryId: String(category._id),
  });
  revalidatePath('/inventory');

  return {
    success: true,
    message: 'Import committed.',
    report,
  };
}
