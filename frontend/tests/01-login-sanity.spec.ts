import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

/**
 * Sanity check #1 — confirms every user in the SEC (AHH Security Services)
 * approval chain can actually log in. Run this FIRST before the full
 * end-to-end workflow test, so login problems don't get confused with
 * workflow-routing problems later.
 */
const users = [
  { role: 'Requester', email: process.env.REQUESTER_EMAIL!, password: process.env.REQUESTER_PASSWORD! },
  { role: 'Department Manager', email: process.env.DEPT_MANAGER_EMAIL!, password: process.env.DEPT_MANAGER_PASSWORD! },
  { role: 'IT Manager', email: process.env.IT_MANAGER_EMAIL!, password: process.env.IT_MANAGER_PASSWORD! },
  { role: 'Logistics Manager', email: process.env.LOGISTICS_MANAGER_EMAIL!, password: process.env.LOGISTICS_MANAGER_PASSWORD! },
  { role: 'Budget Manager', email: process.env.BUDGET_MANAGER_EMAIL!, password: process.env.BUDGET_MANAGER_PASSWORD! },
  { role: 'CEO', email: process.env.CEO_EMAIL!, password: process.env.CEO_PASSWORD! },
  { role: 'Purchase Manager', email: process.env.PURCHASE_MANAGER_EMAIL!, password: process.env.PURCHASE_MANAGER_PASSWORD! },
];

for (const u of users) {
  test(`login works for ${u.role} (${u.email})`, async ({ page }) => {
    await loginAs(page, u.email, u.password);
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
  });
}