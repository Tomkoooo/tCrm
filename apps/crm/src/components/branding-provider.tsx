'use client';

import { createContext, useContext } from 'react';
import type { BrandingSettings } from '@crm/db-core';

export type BrandingContextValue = BrandingSettings & {
  logoUrl?: string;
  faviconUrl?: string;
  loginBackgroundUrl?: string;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

// Inlined rather than importing `brandingMediaUrl` from @crm/db-core — this is a
// 'use client' component, and that package pulls in mongoose (server-only).
function mediaUrl(mediaId: string | undefined): string | undefined {
  return mediaId ? `/api/media/${mediaId}/file` : undefined;
}

function withMediaUrls(branding: BrandingSettings): BrandingContextValue {
  return {
    ...branding,
    logoUrl: mediaUrl(branding.logoId),
    faviconUrl: mediaUrl(branding.faviconId),
    loginBackgroundUrl: mediaUrl(branding.loginBackgroundId),
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
