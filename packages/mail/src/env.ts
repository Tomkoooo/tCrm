const UNUSABLE_HOSTS = new Set(['0.0.0.0', '[::]', '::']);

/** Hostnames that are valid for user-facing links but not for email/redirect base URLs. */
export function isUsablePublicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (UNUSABLE_HOSTS.has(u.hostname)) return false;
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

function normalizeUrl(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

function pickConfiguredUrl(candidates: Array<string | undefined>): string | undefined {
  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const normalized = normalizeUrl(raw);
    if (isUsablePublicUrl(normalized)) return normalized;
  }
  return undefined;
}

/** Canonical public origin for invite/reset links and redirects (no trailing slash). */
export function resolvePublicAppUrl(): string {
  const vercel = process.env.VERCEL_URL?.trim();
  const vercelUrl = vercel
    ? vercel.startsWith('http')
      ? normalizeUrl(vercel)
      : `https://${vercel.replace(/^\/+/, '')}`
    : undefined;

  return (
    pickConfiguredUrl([
      process.env.APP_URL,
      process.env.AUTH_URL,
      process.env.NEXTAUTH_URL,
      vercelUrl,
    ]) ?? 'http://localhost:3000'
  );
}

/**
 * Ensures AUTH_URL / APP_URL are not bound to 0.0.0.0 (common when `next dev --hostname 0.0.0.0`).
 * Call after loading env (e.g. next.config).
 */
export function ensurePublicUrlEnv(): void {
  const publicUrl = resolvePublicAppUrl();

  if (!pickConfiguredUrl([process.env.APP_URL])) {
    process.env.APP_URL = publicUrl;
  }
  if (!pickConfiguredUrl([process.env.AUTH_URL, process.env.NEXTAUTH_URL])) {
    process.env.AUTH_URL = publicUrl;
  }
}

/** Base URL for links in emails (invite, password reset). */
export function getAppUrl(): string {
  return resolvePublicAppUrl();
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

export function getSmtpFrom(): string {
  return process.env.SMTP_FROM?.trim() || 'no-reply@tcrm.local';
}
