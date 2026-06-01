import NextAuth from 'next-auth';
import { ensurePublicUrlEnv } from '@crm/lib/mail-env';
import { edgeAuthConfig } from './auth.config';
import { authConfig } from './config';

ensurePublicUrlEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...edgeAuthConfig,
  ...authConfig,
  callbacks: {
    ...edgeAuthConfig.callbacks,
    ...authConfig.callbacks,
  },
  trustHost: true,
});
