'use server';

import { revalidatePath } from 'next/cache';
import { connectDB, Warehouse } from '@crm/db';
import { requirePermission } from '@crm/auth';
import { warehouseSchema } from '@crm/lib/validation';

export type WarehouseFormState =
  | { success: false; message: string; fieldErrors?: Record<string, string[]> }
  | { success: true; message: string };

function fieldErrorsFromZod(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fe: Record<string, string[]> = {};
  for (const i of issues) {
    const k = i.path.map(String).join('.') || 'form';
    fe[k] = fe[k] ?? [];
    fe[k].push(i.message);
  }
  return fe;
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
    address: formData.get('address'),
    isActive: formData.get('isActive') !== 'false',
  });

  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation error',
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const existing = await Warehouse.findOne({ key: parsed.data.key });
  if (existing) return { success: false, message: 'Warehouse key already exists.' };

  await Warehouse.create(parsed.data);
  revalidatePath('/admin/warehouses');
  return { success: true, message: 'Warehouse created.' };
}
