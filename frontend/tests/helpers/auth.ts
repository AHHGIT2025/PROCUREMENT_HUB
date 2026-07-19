import { Page, expect } from '@playwright/test';

/**
 * Logs in via the real Login.tsx form (src/pages/Login.tsx) and waits for
 * redirect to /dashboard. Selectors match the confirmed live component:
 *   - email input: placeholder "you@alhattabholding.com"
 *   - password input: type="password" (only one password field on page)
 *   - submit button: type="submit"
 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@alhattabholding.com').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
}