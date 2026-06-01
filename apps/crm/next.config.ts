import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import { ensurePublicUrlEnv } from '@crm/lib/mail-env';
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
  transpilePackages: ['@crm/auth', '@crm/db', '@crm/lib', '@crm/ui', '@crm/core'],
  serverExternalPackages: ['mongoose', 'mongodb', 'bcryptjs'],
};

export default nextConfig;
