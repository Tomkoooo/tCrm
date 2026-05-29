import { ensureBaselineRbac } from './seed';

const SYNCED = Symbol.for('crm.baselineRbacSynced');

/**
 * Upserts baseline permissions and system roles once per Node process.
 * Safe to call from the dashboard layout so existing installs pick up new keys
 * without a manual seed after deploy.
 */
export async function ensureBaselineRbacOnce(): Promise<void> {
  const g = globalThis as typeof globalThis & { [SYNCED]?: boolean };
  if (g[SYNCED]) return;
  await ensureBaselineRbac();
  g[SYNCED] = true;
}
