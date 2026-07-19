import { test, expect, Page } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

/**
 * Full end-to-end test for the SEC-AST-IT-COMBO global workflow
 * (GLB-COMBO-ASTIT-61): Asset + IT category items in one request.
 *
 * Expected chain (confirmed via SQL rollout):
 *   Department Manager -> IT Manager -> Budget Manager -> CEO -> Purchase Manager
 *
 * Built from a recorded codegen session on 2026-07-13, cleaned up to
 * remove exploration clicks/typos and add proper assertions + a stable
 * way to locate the right row when an approver has multiple pending items.
 */

async function approveRequest(page: Page, requestNumber: string) {
  const row = page.getByRole('row', { name: new RegExp(requestNumber) });
  await expect(row).toBeVisible({ timeout: 10_000 });

  // Open the read-only details modal, then close it - Approve lives on the
  // row itself, and the modal's backdrop would otherwise intercept the click.
  await row.getByRole('button', { name: /View/ }).click();
  await page.getByRole('button', { name: '✕', exact: true }).click();

  // Click Approve scoped to THIS row specifically - avoids ambiguity when
  // the approver has other pending requests queued at the same time.
  await row.getByRole('button', { name: '✓ Approve' }).click();

  // Wait for the ACTUAL backend call to complete before moving on - a plain
  // click() only confirms the button was clicked, not that the approval
  // was actually persisted. This is what was silently failing before.
  const approveResponse = page.waitForResponse(
    resp => /\/api\/approvals\/.+\/approve/.test(resp.url()) && resp.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '✅ Confirm Approve' }).click();
  const response = await approveResponse;
  expect(response.ok(), `Approve API call failed with status ${response.status()}`).toBeTruthy();
}

test('SEC Asset+IT combo request routes through full chain: DM -> IT Manager -> Budget -> CEO -> Purchase', async ({ page }) => {
  // ---------------------------------------------------------------
  // 1. Requester (Jovita) creates the request: 1 Asset item + 1 IT item
  // ---------------------------------------------------------------
  await loginAs(page, process.env.REQUESTER_EMAIL!, process.env.REQUESTER_PASSWORD!);

  await page.getByRole('button', { name: 'Requests' }).click();
  await page.getByRole('link', { name: 'Create Request' }).click();

  // Project
  await page.locator('div').filter({ hasText: /^Search project\.\.\.$/ }).nth(1).click();
  await page.getByText('SEC1150 — SS150 Al Rayyan for').click();

  // Delivery details
  await page.getByRole('textbox', { name: 'e.g. Main Store, Site A' }).fill('delivery');
  await page.getByRole('textbox', { name: 'e.g. +974 5555' }).fill('9879599');
  await page.getByRole('textbox', { name: 'Describe why this purchase is' }).fill('Playwright E2E test - SEC Asset+IT combo');

  // Asset item
  await page.getByRole('button', { name: 'Asset', exact: true }).click();
  await page.getByText('Search by code or name...').click();
  await page.getByText('E0022 — 13A DOUBLE SOCKET 3').click();
  await page.getByRole('button', { name: '+ Add Item' }).click();

  // IT item
  await page.getByRole('button', { name: 'IT & Technology' }).click();
  await page.locator('div').filter({ hasText: /^Search by code or name\.\.\.$/ }).nth(1).click();
  await page.getByText('SEC00182 — 6LJ70402200 DRUM').click();
  await page.getByRole('button', { name: '+ Add Item' }).click();

  await page.getByRole('button', { name: 'Submit for Approval' }).click();

  // Capture the request number from My Requests (most recent row) so
  // every later approver step can find the exact right request.
  await page.getByRole('link', { name: 'My Requests' }).click();
  const firstRequestCell = page.locator('table tbody tr').first();
  await expect(firstRequestCell).toBeVisible({ timeout: 10_000 });
  const rowText = await firstRequestCell.innerText();
  const requestNumberMatch = rowText.match(/\d{2}[A-Z]{2}\d+/);
  expect(requestNumberMatch, `Could not find a request number in row text: ${rowText}`).not.toBeNull();
  const requestNumber = requestNumberMatch![0];
  console.log(`Created request: ${requestNumber}`);

  await logout(page);

  // ---------------------------------------------------------------
  // 2. Department Manager (Adel Hassan) approves
  // ---------------------------------------------------------------
  await loginAs(page, process.env.DEPT_MANAGER_EMAIL!, process.env.DEPT_MANAGER_PASSWORD!);
  await page.getByRole('button', { name: 'Requests' }).click();
  await page.getByRole('link', { name: 'Approvals' }).click();
  await approveRequest(page, requestNumber);
  await logout(page);

  // ---------------------------------------------------------------
  // 3. IT Manager (Shan Muhammed) approves
  // ---------------------------------------------------------------
  await loginAs(page, process.env.IT_MANAGER_EMAIL!, process.env.IT_MANAGER_PASSWORD!);
  await page.getByRole('button', { name: 'Go to Approvals' }).click();
  await approveRequest(page, requestNumber);
  await logout(page);

  // ---------------------------------------------------------------
  // 4. Budget Manager (Praveen Varanat) approves
  // ---------------------------------------------------------------
  await loginAs(page, process.env.BUDGET_MANAGER_EMAIL!, process.env.BUDGET_MANAGER_PASSWORD!);
  await page.getByRole('button', { name: 'Go to Approvals' }).click();
  await approveRequest(page, requestNumber);
  await logout(page);

  // ---------------------------------------------------------------
  // 5. CEO (Mohammed Amer) approves
  //    (Confirms the ASSET-type CEO-trigger rule fired correctly —
  //    this is the step that wouldn't happen for a plain GENERAL request)
  // ---------------------------------------------------------------
  await loginAs(page, process.env.CEO_EMAIL!, process.env.CEO_PASSWORD!);
  await page.getByRole('button', { name: 'Go to Approvals' }).click();
  await approveRequest(page, requestNumber);
  await logout(page);

  // ---------------------------------------------------------------
  // 6. Purchase Manager (Eiad Ibrahim) — final step (confirmed: needs
  //    explicit Approve click, same as every other step)
  // ---------------------------------------------------------------
  await loginAs(page, process.env.PURCHASE_MANAGER_EMAIL!, process.env.PURCHASE_MANAGER_PASSWORD!);
  await page.getByRole('button', { name: 'Requests' }).click();
  await page.getByRole('link', { name: 'Approvals' }).click();
  await approveRequest(page, requestNumber);
  await logout(page);

  // ---------------------------------------------------------------
  // 7. Requester confirms the request shows "Fully Approved"
  // ---------------------------------------------------------------
  await loginAs(page, process.env.REQUESTER_EMAIL!, process.env.REQUESTER_PASSWORD!);
  await page.getByRole('button', { name: 'Requests' }).click();
  await page.getByRole('link', { name: 'My Requests' }).click();
  const finalRow = page.getByRole('row', { name: new RegExp(requestNumber) });
  await expect(finalRow).toContainText(/Approved/i, { timeout: 10_000 });
});