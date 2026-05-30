import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isPublicRegistrationEnabled } from '@crm/lib/env';
import { fetchSystemInitialized } from '@/lib/system-initialized';

const authSecret = process.env.AUTH_SECRET;
const INITIALIZED_COOKIE = 'tcrm_initialized';

function hasInitializedCookie(request: NextRequest): boolean {
  return request.cookies.get(INITIALIZED_COOKIE)?.value === '1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/reset-password');
  const isSetupPage = pathname.startsWith('/setup');

  const isInviteRegisterPage = pathname.startsWith('/register/invite');

  if (pathname.startsWith('/register') && !isInviteRegisterPage && !isPublicRegistrationEnabled()) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const initialized = hasInitializedCookie(request) || (await fetchSystemInitialized(request));

  if (!initialized && !isSetupPage) {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  if (isSetupPage) {
    if (initialized) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  let isLoggedIn = false;
  if (authSecret) {
    try {
      const token = await getToken({
        req: request,
        secret: authSecret,
        secureCookie: request.nextUrl.protocol === 'https:',
      });
      isLoggedIn = Boolean(token);
    } catch {
      isLoggedIn = false;
    }
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('authjs.session-token');
    response.cookies.delete('__Secure-authjs.session-token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
