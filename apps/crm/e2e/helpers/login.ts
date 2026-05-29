import type { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).waitFor();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}

export function adminCredentials(): { email: string; password: string } {
  return {
    email: process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? 'admin@tcrm.local',
    password: process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'admin123456',
  };
}

export function employeeCredentials(): { email: string; password: string } {
  return {
    email: process.env.E2E_EMPLOYEE_EMAIL ?? 'e2e-employee@tcrm.local',
    password: process.env.E2E_EMPLOYEE_PASSWORD ?? 'e2eemployee123',
  };
}
