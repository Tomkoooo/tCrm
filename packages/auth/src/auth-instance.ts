import NextAuth from 'next-auth';
import { authConfig, middlewareAuthConfig } from './config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...middlewareAuthConfig,
  trustHost: true,
});
