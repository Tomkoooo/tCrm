'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@crm/auth';
import { connectDB, Product } from '@crm/db';
import { syncMediaUsage, linkUrlsFromMediaIds } from '@crm/core';
import { buildKitSchema, parseWarehouseIdsJson } from '@crm/lib/validation';
import { getInventoryWarehouseScope } from '@/lib/inventory/warehouse-scope';

export type BuildFormState =
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

export async function createBuildAction(
  _prev: BuildFormState,
  formData: FormData
): Promise<BuildFormState> {
  await requirePermission('inventory:write');
  await connectDB();

  let components: Array<{ productId: string; quantity: number }> = [];
  try {
    components = JSON.parse(String(formData.get('componentsJson') ?? '[]')) as typeof components;
  } catch {
    return { success: false, message: 'Érvénytelen alkatrész lista.' };
  }

  const parsed = buildKitSchema.safeParse({
    sku: formData.get('sku'),
    names: {
      de: formData.get('name_de'),
      en: formData.get('name_en'),
      hu: formData.get('name_hu'),
    },
    assemblyGuide: formData.get('assemblyGuide'),
    components,
    externalImageHints: [],
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(parsed.error.issues),
      message: 'Ellenőrizd a mezőket.',
    };
  }

  const existing = await Product.findOne({ sku: parsed.data.sku }).exec();
  if (existing) {
    return { success: false, message: 'Ez a CRM SKU már létezik.' };
  }

  const componentDocs = await Product.find({
    _id: { $in: parsed.data.components.map((c) => c.productId) },
    isActive: true,
  })
    .select('_id')
    .lean()
    .exec();

  if (componentDocs.length !== parsed.data.components.length) {
    return { success: false, message: 'Egy vagy több alkatrész nem található vagy inaktív.' };
  }

  let warehouseIdStrings: string[] = [];
  try {
    warehouseIdStrings = parseWarehouseIdsJson(formData.get('warehouseIdsJson') as string);
  } catch {
    return { success: false, message: 'Érvénytelen raktár lista.' };
  }
  const scope = await getInventoryWarehouseScope();
  if (!scope.isGlobal && warehouseIdStrings.length === 0) {
    return { success: false, message: 'Legalább egy raktár kötelező.' };
  }
  if (!scope.isGlobal && warehouseIdStrings.some((id) => !scope.warehouseIds.includes(id))) {
    return { success: false, message: 'Nincs jogosultság a kiválasztott raktárhoz.' };
  }
  const warehouseIds = warehouseIdStrings.map((id) => new mongoose.Types.ObjectId(id));

  const imageIds = formData
    .getAll('imageId')
    .map((v) => String(v))
    .filter(Boolean);

  const externalImageHints = await linkUrlsFromMediaIds(imageIds);

  const created = await Product.create({
    sku: parsed.data.sku,
    names: parsed.data.names,
    assemblyGuide: parsed.data.assemblyGuide,
    externalImageHints,
    imageIds: imageIds.map((id) => new mongoose.Types.ObjectId(id)),
    categoryIds: [],
    warehouseIds,
    components: parsed.data.components.map((c) => ({
      productId: new mongoose.Types.ObjectId(c.productId),
      quantity: c.quantity,
    })),
    isActive: true,
    isDiscontinued: false,
  });

  if (imageIds.length > 0) {
    await syncMediaUsage({
      entityType: 'product',
      entityId: created._id,
      previousMediaIds: [],
      nextMediaIds: imageIds,
    });
  }

  revalidatePath('/inventory/builds');
  revalidatePath('/inventory');
  return { success: true, message: 'Összeszerelés létrehozva.', sku: parsed.data.sku };
}
