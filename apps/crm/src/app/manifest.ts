import type { MetadataRoute } from 'next';
import { getBranding } from '@crm/db';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBranding();

  return {
    id: '/',
    name: branding.appName,
    short_name: branding.appName,
    description: branding.loginSubtitle,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fafafa',
    theme_color: '#18181b',
    icons: [
      {
        src: '/pwa-icon/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/pwa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
