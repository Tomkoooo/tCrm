import { connectDB } from './connection';
import { Branding } from './models/Branding';

export type BrandingSettings = {
  appName: string;
  companyName: string;
  faviconId?: string;
  logoId?: string;
  loginBackgroundId?: string;
  loginTitle: string;
  loginSubtitle: string;
  footerText: string;
};

export const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'tCrm',
  companyName: 'Belső CRM',
  loginTitle: 'Sign in to tCrm',
  loginSubtitle: 'Enter your credentials to access the CRM',
  footerText: '© 2026 tCrm. Minden jog fenntartva.',
};

function toBrandingSettings(doc: {
  appName: string;
  companyName: string;
  faviconId?: { toString(): string };
  logoId?: { toString(): string };
  loginBackgroundId?: { toString(): string };
  loginTitle: string;
  loginSubtitle: string;
  footerText: string;
}): BrandingSettings {
  return {
    appName: doc.appName,
    companyName: doc.companyName,
    faviconId: doc.faviconId ? doc.faviconId.toString() : undefined,
    logoId: doc.logoId ? doc.logoId.toString() : undefined,
    loginBackgroundId: doc.loginBackgroundId ? doc.loginBackgroundId.toString() : undefined,
    loginTitle: doc.loginTitle,
    loginSubtitle: doc.loginSubtitle,
    footerText: doc.footerText,
  };
}

export async function getBranding(): Promise<BrandingSettings> {
  try {
    await connectDB();
    const doc = await Branding.findOne().lean().exec();
    if (!doc) return { ...DEFAULT_BRANDING };
    return toBrandingSettings(doc);
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

export type UpdateBrandingInput = Partial<
  Omit<BrandingSettings, 'faviconId' | 'logoId' | 'loginBackgroundId'> & {
    faviconId?: string | null;
    logoId?: string | null;
    loginBackgroundId?: string | null;
  }
>;

export async function updateBranding(data: UpdateBrandingInput): Promise<BrandingSettings> {
  await connectDB();

  const update: Record<string, unknown> = {};
  if (data.appName !== undefined) update.appName = data.appName;
  if (data.companyName !== undefined) update.companyName = data.companyName;
  if (data.loginTitle !== undefined) update.loginTitle = data.loginTitle;
  if (data.loginSubtitle !== undefined) update.loginSubtitle = data.loginSubtitle;
  if (data.footerText !== undefined) update.footerText = data.footerText;
  if (data.faviconId !== undefined) update.faviconId = data.faviconId ?? null;
  if (data.logoId !== undefined) update.logoId = data.logoId ?? null;
  if (data.loginBackgroundId !== undefined)
    update.loginBackgroundId = data.loginBackgroundId ?? null;

  const doc = await Branding.findOneAndUpdate(
    {},
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean()
    .exec();

  if (!doc) return { ...DEFAULT_BRANDING };
  return toBrandingSettings(doc);
}

export function brandingMediaUrl(mediaId: string | undefined): string | undefined {
  if (!mediaId) return undefined;
  return `/api/media/${mediaId}/file`;
}
