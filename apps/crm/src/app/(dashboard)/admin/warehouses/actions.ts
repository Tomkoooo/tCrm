'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@crm/auth';
import { connectDB, Warehouse } from '@crm/db';
import { warehouseSchema } from '@crm/lib/validation';

export type WarehouseFormState =
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

export async function createWarehouseAction(
  _prev: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  await requirePermission('warehouses:manage');
  await connectDB();

  const parsed = warehouseSchema.safeParse({
    key: formData.get('key'),
    name: formData.get('name'),
    address: formData.get('address') || undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const existing = await Warehouse.findOne({ key: parsed.data.key }).exec();
  if (existing) {
    return { success: false, message: 'Ez a raktár kulcs már létezik.' };
  }

  const wh = await Warehouse.create(parsed.data);
  revalidatePath('/admin/warehouses');
  return { success: true, message: 'Raktár létrehozva.', id: wh._id.toString() };
}

export async function updateWarehouseAction(
  id: string,
  _prev: WarehouseFormState,
  formData: FormData
): Promise<WarehouseFormState> {
  await requirePermission('warehouses:manage');
  await connectDB();

  const parsed = warehouseSchema.safeParse({
    key: formData.get('key'),
    name: formData.get('name'),
    address: formData.get('address') || undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const wh = await Warehouse.findById(id);
  if (!wh) return { success: false, message: 'Raktár nem található.' };

  if (parsed.data.key !== wh.key) {
    const dup = await Warehouse.findOne({ key: parsed.data.key }).exec();
    if (dup) return { success: false, message: 'Ez a raktár kulcs már foglalt.' };
  }

  wh.key = parsed.data.key;
  wh.name = parsed.data.name;
  wh.address = parsed.data.address;
  wh.isActive = parsed.data.isActive ?? true;
  await wh.save();

  revalidatePath('/admin/warehouses');
  revalidatePath(`/admin/warehouses/${id}`);
  return { success: true, message: 'Raktár mentve.' };
}

export async function deleteWarehouseAction(id: string): Promise<WarehouseFormState> {
  await requirePermission('warehouses:manage');
  await connectDB();

  const wh = await Warehouse.findByIdAndDelete(id);
  if (!wh) return { success: false, message: 'Raktár nem található.' };

  revalidatePath('/admin/warehouses');
  return { success: true, message: 'Raktár törölve.' };
}
