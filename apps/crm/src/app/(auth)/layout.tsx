import { getBranding, brandingMediaUrl } from '@crm/db-core';
import { AuthShell } from './auth-shell';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  const loginBackgroundUrl = brandingMediaUrl(branding.loginBackgroundId);

  return <AuthShell loginBackgroundUrl={loginBackgroundUrl}>{children}</AuthShell>;
}
