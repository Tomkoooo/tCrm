import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import { ensurePublicUrlEnv } from '@crm/mail/env';
import type { NextConfig } from 'next';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(appDir, '../..');

// Monorepo: load repo-root `.env` first, then `apps/crm/.env.local` overrides
loadEnvConfig(repoRoot);
loadEnvConfig(appDir);
ensurePublicUrlEnv();

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  transpilePackages: [
    '@crm/admin',
    '@crm/auth',
    '@crm/db-core',
    '@crm/employee-core',
    '@crm/inventory',
    '@crm/logistics',
    '@crm/lib',
    '@crm/mail',
    '@crm/media',
    '@crm/rbac',
    '@crm/ui',
  ],
  serverExternalPackages: ['mongoose', 'mongodb', 'bcryptjs', 'xlsx'],
};

export default nextConfig;
