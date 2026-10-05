import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAppUrl } from '@crm/mail/env';
import { isPublicRegistrationEnabled } from '@crm/lib/env';
import { hasInitializedCookie } from '@/lib/initialized-cookie';

const authSecret = process.env.AUTH_SECRET;

function redirectTo(pathname: string, search?: string) {
  const url = new URL(pathname, getAppUrl());
  if (search) url.search = search;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Magic-link sign-in must be reachable without a session: the recipient clicks it
  // straight from a notification e-mail.
  const isMagicLinkPage = pathname.startsWith('/auth/magic');
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/reset-password') ||
    isMagicLinkPage;
  const isSetupPage = pathname.startsWith('/setup');

  const isInviteRegisterPage = pathname.startsWith('/register/invite');

  if (pathname.startsWith('/register') && !isInviteRegisterPage && !isPublicRegistrationEnabled()) {
    return redirectTo('/login');
  }

  const initialized = hasInitializedCookie(request);

  if (!initialized && !isSetupPage) {
    return redirectTo('/setup');
  }

  if (isSetupPage) {
    if (initialized) {
      return redirectTo('/login');
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
    // An already-signed-in visitor still needs the magic page to run, so the link
    // can hand them off to the schedule it points at (possibly as another user).
    if (isLoggedIn && !isInviteRegisterPage && !isMagicLinkPage) {
      return redirectTo('/');
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const response = redirectTo('/login');
    response.cookies.delete('authjs.session-token');
    response.cookies.delete('__Secure-authjs.session-token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
