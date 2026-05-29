import { test, expect } from '@playwright/test';
import { employeeCredentials, loginAs } from './helpers/login';

test.describe('accounting self-service', () => {
  test('linked employee sees schedule on /accounting/my', async ({ page }) => {
    const { email, password } = employeeCredentials();
    await loginAs(page, email, password);
    await page.goto('/accounting/my');
    await expect(page.getByTestId('my-hr-schedule')).toBeVisible();
    await expect(page.getByTestId('my-no-employee')).toHaveCount(0);
  });
});
