'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@crm/auth';
import { getBranding, updateBranding } from '@crm/db';
import { brandingUpdateSchema } from '@crm/lib/validation';

export type BrandingFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string };

export async function getBrandingForAdmin() {
  await requirePermission('admin:access');
  return getBranding();
}

export async function updateBrandingAction(
  _prev: BrandingFormState,
  formData: FormData
): Promise<BrandingFormState> {
  await requirePermission('admin:access');

  const parsed = brandingUpdateSchema.safeParse({
    appName: formData.get('appName'),
    companyName: formData.get('companyName'),
    loginTitle: formData.get('loginTitle'),
    loginSubtitle: formData.get('loginSubtitle'),
    footerText: formData.get('footerText') ?? '',
    faviconId: formData.get('faviconId') ?? undefined,
    logoId: formData.get('logoId') ?? undefined,
    loginBackgroundId: formData.get('loginBackgroundId') ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: 'Ellenőrizze a mezőket.',
    };
  }

  const data = parsed.data;
  await updateBranding({
    appName: data.appName,
    companyName: data.companyName,
    loginTitle: data.loginTitle,
    loginSubtitle: data.loginSubtitle,
    footerText: data.footerText || '© 2026 tCrm. Minden jog fenntartva.',
    faviconId: data.faviconId ?? null,
    logoId: data.logoId ?? null,
    loginBackgroundId: data.loginBackgroundId ?? null,
  });

  revalidatePath('/', 'layout');
  revalidatePath('/admin/branding');

  return { success: true, message: 'Arculat mentve.' };
}
