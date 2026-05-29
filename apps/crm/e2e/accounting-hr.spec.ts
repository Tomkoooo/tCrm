import { test, expect } from '@playwright/test';
import { adminCredentials, loginAs } from './helpers/login';

test.describe('accounting HR (admin)', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = adminCredentials();
    await loginAs(page, email, password);
  });

  test('admin sees accounting overview', async ({ page }) => {
    await page.goto('/accounting');
    await expect(page.getByTestId('accounting-overview')).toBeVisible();
    await expect(page.getByTestId('accounting-overview')).toHaveText('Könyvelés és HR');
  });
});
