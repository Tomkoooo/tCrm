'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { connectDB, Category, Product } from '@crm/db-core';
import { categorySchema } from '@crm/lib/validation';

export type CategoryFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  await requirePermission('inventory:write');
  await connectDB();

  const parentIdRaw = String(formData.get('parentId') ?? '').trim();
  const parsed = categorySchema.safeParse({
    level: formData.get('level'),
    parentId: parentIdRaw || undefined,
    slug: formData.get('slug'),
    names: {
      de: formData.get('name_de') || undefined,
      en: formData.get('name_en') || undefined,
      hu: formData.get('name_hu') || undefined,
    },
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const skuPrefix = String(formData.get('skuPrefix') ?? '').trim() || undefined;
  const skuTotalLength = formData.get('skuTotalLength')
    ? Number(formData.get('skuTotalLength'))
    : undefined;

  const cat = await Category.create({
    ...parsed.data,
    parentId: parentIdRaw ? new mongoose.Types.ObjectId(parentIdRaw) : undefined,
    skuPrefix,
    skuTotalLength,
    skuPadChar: String(formData.get('skuPadChar') ?? '0') || '0',
  });

  revalidatePath('/inventory/categories');
  return { success: true, message: 'Kategória létrehozva.', id: cat._id.toString() };
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  await requirePermission('inventory:write');
  await connectDB();

  const parentIdRaw = String(formData.get('parentId') ?? '').trim();
  const parsed = categorySchema.safeParse({
    level: formData.get('level'),
    parentId: parentIdRaw || undefined,
    slug: formData.get('slug'),
    names: {
      de: formData.get('name_de') || undefined,
      en: formData.get('name_en') || undefined,
      hu: formData.get('name_hu') || undefined,
    },
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const cat = await Category.findById(id);
  if (!cat) return { success: false, message: 'Kategória nem található.' };

  cat.level = parsed.data.level;
  cat.parentId = parentIdRaw ? new mongoose.Types.ObjectId(parentIdRaw) : undefined;
  cat.slug = parsed.data.slug;
  cat.names = parsed.data.names;
  cat.skuPrefix = String(formData.get('skuPrefix') ?? '').trim() || undefined;
  cat.skuTotalLength = formData.get('skuTotalLength')
    ? Number(formData.get('skuTotalLength'))
    : undefined;
  cat.skuPadChar = String(formData.get('skuPadChar') ?? '0') || '0';
  await cat.save();

  revalidatePath('/inventory/categories');
  return { success: true, message: 'Kategória mentve.' };
}

export async function deleteCategoryAction(id: string): Promise<CategoryFormState> {
  await requirePermission('inventory:write');
  await connectDB();

  const inUse = await Product.countDocuments({ categoryIds: id }).exec();
  if (inUse > 0) {
    return {
      success: false,
      message: `A kategória ${inUse} termékhez van rendelve. Előbb távolítsa el a hozzárendeléseket.`,
    };
  }

  const children = await Category.countDocuments({ parentId: id }).exec();
  if (children > 0) {
    return { success: false, message: 'A kategóriának vannak alkategóriái. Előbb törölje azokat.' };
  }

  const cat = await Category.findByIdAndDelete(id);
  if (!cat) return { success: false, message: 'Kategória nem található.' };

  revalidatePath('/inventory/categories');
  return { success: true, message: 'Kategória törölve.' };
}
