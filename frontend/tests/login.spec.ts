import { test, expect } from '@playwright/test';

test('admin login', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.getByPlaceholder('you@alhattab.com')
    .fill('admin@alhattab.com');

  await page.getByPlaceholder('Enter your password')
    .fill('Admin@123');

  await page.getByRole('button', {
    name: /sign in/i
  }).click();

  await expect(page).toHaveURL(/dashboard/);
});