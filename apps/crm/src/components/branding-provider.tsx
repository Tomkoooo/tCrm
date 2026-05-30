'use client';

import { createContext, useContext } from 'react';
import type { BrandingSettings } from '@crm/db';

export type BrandingContextValue = BrandingSettings & {
  logoUrl?: string;
  faviconUrl?: string;
  loginBackgroundUrl?: string;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function withMediaUrls(branding: BrandingSettings): BrandingContextValue {
  return {
    ...branding,
    logoUrl: branding.logoId ? `/api/uploads/${branding.logoId}` : undefined,
    faviconUrl: branding.faviconId ? `/api/uploads/${branding.faviconId}` : undefined,
    loginBackgroundUrl: branding.loginBackgroundId
      ? `/api/uploads/${branding.loginBackgroundId}`
      : undefined,
  };
}

export function BrandingProvider({
  branding,
  children,
}: {
  branding: BrandingSettings;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={withMediaUrls(branding)}>{children}</BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}
