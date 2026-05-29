import { test, expect } from '@playwright/test';
import { adminCredentials, loginAs } from './helpers/login';

test.describe('authentication', () => {
  test('admin can sign in and reach dashboard', async ({ page }) => {
    const { email, password } = adminCredentials();
    await loginAs(page, email, password);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
