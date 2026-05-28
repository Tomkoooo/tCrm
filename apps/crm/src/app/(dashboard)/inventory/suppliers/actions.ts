'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyPermission } from '@crm/auth';
import { SUPPLIER_MANAGE_PERMISSION_KEYS } from '@crm/lib';
import { connectDB, Supplier } from '@crm/db';
import { contactsHaveData, type SupplierContactEntry } from '@crm/lib';
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

function parseContactsJson(raw: FormDataEntryValue | null): SupplierContactEntry[] | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const entries = parsed
      .map((item) => ({
        role: String(item?.role ?? '').trim(),
        name: item?.name ? String(item.name).trim() : undefined,
        phone: item?.phone ? String(item.phone).trim() : undefined,
        email: item?.email ? String(item.email).trim() : undefined,
      }))
      .filter((c) => c.role);
    return contactsHaveData(entries) ? entries : undefined;
  } catch {
    return undefined;
  }
}

function parseSupplierForm(formData: FormData) {
  const contacts = parseContactsJson(formData.get('contactsJson'));

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
    contacts,
  });
}

export async function createSupplierAction(
  _prev: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  await requireAnyPermission([...SUPPLIER_MANAGE_PERMISSION_KEYS]);
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
  await requireAnyPermission([...SUPPLIER_MANAGE_PERMISSION_KEYS]);
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
  await requireAnyPermission([...SUPPLIER_MANAGE_PERMISSION_KEYS]);
  await connectDB();

  const supplier = await Supplier.findByIdAndDelete(id);
  if (!supplier) return { success: false, message: 'Beszállító nem található.' };

  revalidatePath('/inventory/suppliers');
  return { success: true, message: 'Beszállító törölve.' };
}
