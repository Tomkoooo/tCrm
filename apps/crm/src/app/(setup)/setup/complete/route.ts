import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { connectDB, hasAnyAdminUser } from '@crm/db';
import { applyInitializedCookie } from '@/lib/initialized-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sets the initialized cookie when an admin exists, then redirects (seeded / existing installs). */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    if (!(await hasAnyAdminUser())) {
      return NextResponse.redirect(new URL('/setup', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  return applyInitializedCookie(NextResponse.redirect(new URL('/login', request.url)));
}
