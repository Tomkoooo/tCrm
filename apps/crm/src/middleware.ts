import { isPublicRegistrationEnabled } from '@crm/lib/env';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const authSecret = process.env.AUTH_SECRET;

async function isSystemInitialized(requestUrl: string): Promise<boolean> {
  try {
    const url = new URL('/api/system/initialized', requestUrl);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = (await res.json()) as { initialized?: boolean };
    return Boolean(data.initialized);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isSetupPage = pathname.startsWith('/setup');

  if (pathname.startsWith('/register') && !isPublicRegistrationEnabled()) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const initialized = await isSystemInitialized(request.url);

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
