import baseConfig from '@crm/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts', 'e2e/**'],
  },
];
