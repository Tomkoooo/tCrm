import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const INITIALIZED_COOKIE = 'tcrm_initialized';

const cookieOptions = () => {
  const secure = (process.env.AUTH_URL ?? process.env.APP_URL ?? '').startsWith('https');
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure,
  };
};

export function hasInitializedCookie(request: NextRequest): boolean {
  return request.cookies.get(INITIALIZED_COOKIE)?.value === '1';
}

export function applyInitializedCookie(response: NextResponse): NextResponse {
  response.cookies.set(INITIALIZED_COOKIE, '1', cookieOptions());
  return response;
}

export async function setInitializedCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INITIALIZED_COOKIE, '1', cookieOptions());
}
