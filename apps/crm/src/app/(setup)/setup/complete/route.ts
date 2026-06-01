import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { connectDB, hasAnyAdminUser } from '@crm/db';
import { getAppUrl } from '@crm/lib/mail-env';
import { applyInitializedCookie } from '@/lib/initialized-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function redirectTo(pathname: string) {
  return NextResponse.redirect(new URL(pathname, getAppUrl()));
}

/** Sets the initialized cookie when an admin exists, then redirects (seeded / existing installs). */
export async function GET(request: NextRequest) {
  void request;
  try {
    await connectDB();
    if (!(await hasAnyAdminUser())) {
      return redirectTo('/setup');
    }
  } catch {
    return redirectTo('/setup');
  }

  return applyInitializedCookie(redirectTo('/login'));
}
