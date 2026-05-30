import { defineConfig } from 'vitest/config';

/** GitHub Actions sets CI=true — mongodb-memory-server cannot run in parallel there. */
const isCi = Boolean(process.env.CI);

export default defineConfig({
  test: {
    hookTimeout: 120_000,
    testTimeout: 30_000,
    exclude: isCi ? ['**/node_modules/**', '**/*.integration.test.ts'] : ['**/node_modules/**'],
  },
});
