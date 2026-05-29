import { defineConfig, devices } from '@playwright/test';
import { loadAppEnv } from './e2e/load-env';

/** Playwright runs with cwd = apps/crm (see package.json test:e2e). */
const appDir = process.cwd();

loadAppEnv();

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? process.env.AUTH_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `sh -c 'test -f .next/standalone/apps/crm/server.js || pnpm run build; mkdir -p .next/standalone/apps/crm/.next; cp -R .next/static .next/standalone/apps/crm/.next/static; cp -R public .next/standalone/apps/crm/public 2>/dev/null || true; HOSTNAME=127.0.0.1 PORT=${port} node .next/standalone/apps/crm/server.js'`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    cwd: appDir,
    env: {
      ...process.env,
      AUTH_URL: baseURL,
      PORT: String(port),
    },
  },
});
