import { getBranding } from '@crm/db';
import { AuthShell } from './auth-shell';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  const loginBackgroundUrl = branding.loginBackgroundId
    ? `/api/uploads/${branding.loginBackgroundId}`
    : undefined;

  return <AuthShell loginBackgroundUrl={loginBackgroundUrl}>{children}</AuthShell>;
}
