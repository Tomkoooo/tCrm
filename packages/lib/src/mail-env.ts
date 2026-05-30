/** Base URL for links in emails (invite, password reset). */
export function getAppUrl(): string {
  const app = process.env.APP_URL?.trim();
  if (app) return app.replace(/\/$/, '');
  const auth = process.env.AUTH_URL?.trim();
  if (auth) return auth.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

export function getSmtpFrom(): string {
  return process.env.SMTP_FROM?.trim() || 'no-reply@tcrm.local';
}
