import NextAuth from 'next-auth';
import { edgeAuthConfig } from './auth.config';
import { authConfig } from './config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...edgeAuthConfig,
  ...authConfig,
  callbacks: {
    ...edgeAuthConfig.callbacks,
    ...authConfig.callbacks,
  },
  trustHost: true,
});
