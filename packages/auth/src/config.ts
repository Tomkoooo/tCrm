import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB, hasAnyAdminUser, User } from '@crm/db';
import { loginSchema } from '@crm/lib/validation';
import { getEffectivePermissionKeys } from './permissions';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
        if (!user || !user.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id && (user?.id || trigger === 'update')) {
        const permissions = await getEffectivePermissionKeys(token.id as string);
        token.permissions = Array.from(permissions);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
};

// Extend authConfig with authorized for middleware - applied in auth-instance
export const middlewareAuthConfig = {
  callbacks: {
    ...authConfig.callbacks,
    authorized({
      auth,
      request: { nextUrl },
    }: {
      auth: { user?: unknown } | null;
      request: { nextUrl: URL };
    }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
      const isSetupPage = nextUrl.pathname.startsWith('/setup');

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      // First-run setup: if no admin exists, force /setup (but still allow API + static via matcher)
      // NOTE: authorized supports async in Auth.js v5
      return (async () => {
        const initialized = await hasAnyAdminUser();
        if (!initialized && !isSetupPage) {
          return Response.redirect(new URL('/setup', nextUrl));
        }

        if (isSetupPage) {
          // If already initialized, setup should not be reachable
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
};
