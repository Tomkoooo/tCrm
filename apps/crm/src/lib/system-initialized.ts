import type { NextRequest } from 'next/server';

/** Origins to try when middleware checks /api/system/initialized (Docker/proxy-safe). */
function middlewareFetchOrigins(request: NextRequest): string[] {
  const port = process.env.PORT ?? '3000';
  const origins: string[] = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];

  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');
  if (host) {
    origins.push(`${proto}://${host}`);
  }

  const envUrl = process.env.AUTH_URL?.trim() || process.env.APP_URL?.trim();
  if (envUrl) {
    origins.push(envUrl.replace(/\/$/, ''));
  }

  origins.push(request.nextUrl.origin);

  return [...new Set(origins)];
}

export async function fetchSystemInitialized(request: NextRequest): Promise<boolean> {
  for (const origin of middlewareFetchOrigins(request)) {
    try {
      const res = await fetch(`${origin}/api/system/initialized`, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { initialized?: boolean };
      if (data.initialized) return true;
    } catch {
      continue;
    }
  }
  return false;
}
