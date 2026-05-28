'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@crm/auth';
import { connectDB, Supplier } from '@crm/db';
import { supplierSchema } from '@crm/lib/validation';

export type SupplierFormState =
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

function contactFields(formData: FormData, role: string) {
  return {
    [`${role}Name`]: formData.get(`${role}Name`) || undefined,
    [`${role}Phone`]: formData.get(`${role}Phone`) || undefined,
    [`${role}Email`]: formData.get(`${role}Email`) || undefined,
  };
}

function parseSupplierForm(formData: FormData) {
  const contacts = {
    ...contactFields(formData, 'ceo'),
    ...contactFields(formData, 'sales'),
    ...contactFields(formData, 'technical'),
    ...contactFields(formData, 'warehouse'),
    ...contactFields(formData, 'finance'),
  };

  const hasContact = Object.values(contacts).some((v) => v && String(v).trim());

  return supplierSchema.safeParse({
    key: formData.get('key'),
    name: formData.get('name'),
    address: formData.get('address') || undefined,
    city: formData.get('city') || undefined,
    postalCode: formData.get('postalCode') || undefined,
    country: formData.get('country') || undefined,
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    taxNo: formData.get('taxNo') || undefined,
    euTaxNo: formData.get('euTaxNo') || undefined,
    registry: formData.get('registry') || undefined,
    contacts: hasContact ? contacts : undefined,
  });
}

export async function createSupplierAction(
  _prev: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  await requirePermission('suppliers:manage');
  await connectDB();

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const existing = await Supplier.findOne({ key: parsed.data.key }).exec();
  if (existing) {
    return { success: false, message: 'Ez a beszállító kulcs már létezik.' };
  }

  const supplier = await Supplier.create(parsed.data);
  revalidatePath('/inventory/suppliers');
  return { success: true, message: 'Beszállító létrehozva.', id: supplier._id.toString() };
}

export async function updateSupplierAction(
  id: string,
  _prev: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  await requirePermission('suppliers:manage');
  await connectDB();

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const supplier = await Supplier.findById(id);
  if (!supplier) return { success: false, message: 'Beszállító nem található.' };

  if (parsed.data.key !== supplier.key) {
    const dup = await Supplier.findOne({ key: parsed.data.key }).exec();
    if (dup) return { success: false, message: 'Ez a kulcs már foglalt.' };
  }

  Object.assign(supplier, parsed.data);
  await supplier.save();

  revalidatePath('/inventory/suppliers');
  revalidatePath(`/inventory/suppliers/${id}`);
  return { success: true, message: 'Beszállító mentve.' };
}

export async function deleteSupplierAction(id: string): Promise<SupplierFormState> {
  await requirePermission('suppliers:manage');
  await connectDB();

  const supplier = await Supplier.findByIdAndDelete(id);
  if (!supplier) return { success: false, message: 'Beszállító nem található.' };

  revalidatePath('/inventory/suppliers');
  return { success: true, message: 'Beszállító törölve.' };
}
