import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  transpilePackages: ['@crm/auth', '@crm/db', '@crm/lib', '@crm/ui', '@crm/core'],
};

export default nextConfig;
