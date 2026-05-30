import type { NextAuthConfig } from 'next-auth';

async function fetchSystemInitialized(requestUrl: string): Promise<boolean> {
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

/** Edge-safe config — no Node/MongoDB imports. Used by middleware only. */
export const edgeAuthConfig = {
  providers: [],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({
      auth,
      request: { nextUrl },
    }: {
      auth: { user?: unknown } | null;
      request: { nextUrl: URL };
    }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/reset-password');
      const isSetupPage = nextUrl.pathname.startsWith('/setup');

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      return (async () => {
        const initialized = await fetchSystemInitialized(nextUrl.toString());
        if (!initialized && !isSetupPage) {
          return Response.redirect(new URL('/setup', nextUrl));
        }

        if (isSetupPage) {
          if (initialized) {
            return Response.redirect(new URL('/login', nextUrl));
          }
          return true;
        }

        if (!isLoggedIn) {
          return Response.redirect(new URL('/login', nextUrl));
        }

        return true;
      })();
    },
  },
} satisfies NextAuthConfig;
