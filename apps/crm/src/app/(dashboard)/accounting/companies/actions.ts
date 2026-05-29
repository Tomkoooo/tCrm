'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { createCompany, updateCompany } from '@crm/core';
import { connectDB, Company } from '@crm/db';
import { companySchema } from '@crm/lib/validation';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';

export async function createCompanyAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  await connectDB();

  const parsed = companySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    parentCompanyId: formData.get('parentCompanyId') || undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const existing = await Company.findOne({ slug: parsed.data.slug }).exec();
  if (existing) {
    return { success: false, message: 'Ez a slug már létezik.' };
  }

  const parentCompanyId =
    parsed.data.parentCompanyId && mongoose.Types.ObjectId.isValid(parsed.data.parentCompanyId)
      ? new mongoose.Types.ObjectId(parsed.data.parentCompanyId)
      : undefined;

  const company = await createCompany({
    name: parsed.data.name,
    slug: parsed.data.slug,
    parentCompanyId,
    isActive: parsed.data.isActive,
  });

  revalidatePath('/accounting/companies');
  return { success: true, message: 'Cég létrehozva.', id: company._id.toString() };
}

export async function updateCompanyAction(
  id: string,
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = companySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    parentCompanyId: formData.get('parentCompanyId') || undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    const parentCompanyId =
      parsed.data.parentCompanyId && mongoose.Types.ObjectId.isValid(parsed.data.parentCompanyId)
        ? new mongoose.Types.ObjectId(parsed.data.parentCompanyId)
        : null;

    await updateCompany(
      new mongoose.Types.ObjectId(id),
      {
        name: parsed.data.name,
        slug: parsed.data.slug,
        parentCompanyId,
        isActive: parsed.data.isActive,
      },
      userId,
      permissions
    );
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }

  revalidatePath('/accounting/companies');
  revalidatePath(`/accounting/companies/${id}`);
  return { success: true, message: 'Cég mentve.' };
}
