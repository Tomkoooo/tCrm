'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { createCompany, updateCompany } from '@crm/core';
import { connectDB, Company } from '@crm/db';
import { companySchema, parseCompanyDataJson } from '@crm/lib/validation';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';

function parseCompanyForm(formData: FormData) {
  const companyDataJson = String(formData.get('companyDataJson') ?? '');
  let companyData: Record<string, string> = {};
  try {
    companyData = parseCompanyDataJson(companyDataJson);
  } catch {
    return { error: 'Érvénytelen cég adat JSON.' as const };
  }

  const parsed = companySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    parentCompanyId: formData.get('parentCompanyId') || undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    companyDataJson,
  });

  if (!parsed.success) {
    return { error: 'validation' as const, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  return { parsed: parsed.data, companyData };
}

export async function createCompanyAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  await connectDB();

  const result = parseCompanyForm(formData);
  if ('error' in result) {
    if (result.error === 'validation') {
      return { success: false, fieldErrors: result.fieldErrors };
    }
    return { success: false, message: result.error };
  }

  const { parsed, companyData } = result;

  const existing = await Company.findOne({ slug: parsed.slug }).exec();
  if (existing) {
    return { success: false, message: 'Ez a slug már létezik.' };
  }

  const parentCompanyId =
    parsed.parentCompanyId && mongoose.Types.ObjectId.isValid(parsed.parentCompanyId)
      ? new mongoose.Types.ObjectId(parsed.parentCompanyId)
      : undefined;

  const company = await createCompany({
    name: parsed.name,
    slug: parsed.slug,
    parentCompanyId,
    companyData,
    isActive: parsed.isActive,
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

  const result = parseCompanyForm(formData);
  if ('error' in result) {
    if (result.error === 'validation') {
      return { success: false, fieldErrors: result.fieldErrors };
    }
    return { success: false, message: result.error };
  }

  const { parsed, companyData } = result;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    const parentCompanyId =
      parsed.parentCompanyId && mongoose.Types.ObjectId.isValid(parsed.parentCompanyId)
        ? new mongoose.Types.ObjectId(parsed.parentCompanyId)
        : null;

    await updateCompany(
      new mongoose.Types.ObjectId(id),
      {
        name: parsed.name,
        slug: parsed.slug,
        parentCompanyId,
        companyData,
        isActive: parsed.isActive,
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
