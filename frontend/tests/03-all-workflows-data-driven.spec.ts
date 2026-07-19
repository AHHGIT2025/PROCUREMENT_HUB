import { test, expect, Page } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

/**
 * Data-driven end-to-end coverage of every GLB-* global workflow that
 * applies to AHH Security Services (the only company with all approver
 * test users currently set up). Each entry describes which category
 * tab(s)/item(s) to add, and the expected approval chain in order.
 *
 * NOT covered here (SEC has no test items in these categories - test
 * with a different company, e.g. AHH Food Stuff for FMCG_FOOD):
 *   CIVIL, UNIFORM, FMCG_FOOD, FMCG_NFOOD
 */

// Category -> { UI tab label, item search text } - tab labels match
// ItemCategories.Name exactly as seeded in the DB.
const CATEGORY_ITEMS: Record<string, { tab: string; item: string }> = {
  GENERAL: { tab: 'General', item: '00209 — FEMALE BLAZER GREY COLOR WITH LOGO' },
  ASSET: { tab: 'Asset', item: '00012 — LAMINATION MACHINE' },
  IT: { tab: 'IT & Technology', item: '1009 — MOBILE ROUTER' },
  IT_ASSET: { tab: 'IT Assets & Hardware', item: '1000 — TOSHIBA TFC200 BLACK TONER' },
  LOGISTICS: { tab: 'Logistics', item: 'SEC00270 — Tyre for Golf Cart (18X8.50-8)' },
  'LOGISTICS-ASSETS': { tab: 'Logistics Assets', item: 'SEC00177 — PILOTCAR PC – 2+2 UTILITY VEHICLE' },
  PROJECT: { tab: 'Project & Subcontract', item: 'S268 — Professional Indemnity Insurance Prof Guarding &Surveillance' },
  SAFETY: { tab: 'Safety & HSE', item: 'SEC00125 — FIRE XTINGUISHER 1 WET CHEMICAL 6LTR' },
};

// Chain role name -> env credential keys. "Department Manager" is
// intentionally excluded here - it's always Jovita's actual manager
// (Adel), handled separately since it routes dynamically per requester.
const ROLE_CREDENTIALS: Record<string, { email: string; password: string }> = {
  'IT Manager': { email: process.env.IT_MANAGER_EMAIL!, password: process.env.IT_MANAGER_PASSWORD! },
  'Logistics Manager': { email: process.env.LOGISTICS_MANAGER_EMAIL!, password: process.env.LOGISTICS_MANAGER_PASSWORD! },
  'Budget Manager': { email: process.env.BUDGET_MANAGER_EMAIL!, password: process.env.BUDGET_MANAGER_PASSWORD! },
  'CEO': { email: process.env.CEO_EMAIL!, password: process.env.CEO_PASSWORD! },
  'Purchase Manager': { email: process.env.PURCHASE_MANAGER_EMAIL!, password: process.env.PURCHASE_MANAGER_PASSWORD! },
};

interface WorkflowTestCase {
  workflowCode: string;
  categories: string[]; // keys into CATEGORY_ITEMS
  expectedChain: string[]; // role names AFTER Department Manager, in order
}

const TEST_CASES: WorkflowTestCase[] = [
  { workflowCode: 'GLB-GENERAL-10', categories: ['GENERAL'], expectedChain: ['Budget Manager', 'Purchase Manager'] },
  { workflowCode: 'GLB-GENERAL-10 (Safety)', categories: ['SAFETY'], expectedChain: ['Budget Manager', 'Purchase Manager'] },
  { workflowCode: 'GLB-GENERAL-10 (Project)', categories: ['PROJECT'], expectedChain: ['Budget Manager', 'Purchase Manager'] },
  { workflowCode: 'GLB-ASSET-20', categories: ['ASSET'], expectedChain: ['Budget Manager', 'CEO', 'Purchase Manager'] },
  { workflowCode: 'GLB-IT-30', categories: ['IT'], expectedChain: ['IT Manager', 'Budget Manager', 'Purchase Manager'] },
  { workflowCode: 'GLB-ITASSET-31', categories: ['IT_ASSET'], expectedChain: ['IT Manager', 'Budget Manager', 'CEO', 'Purchase Manager'] },
  { workflowCode: 'GLB-LOGISTICS-40', categories: ['LOGISTICS'], expectedChain: ['Logistics Manager', 'Budget Manager', 'Purchase Manager'] },
  { workflowCode: 'GLB-LOGASSET-41', categories: ['LOGISTICS-ASSETS'], expectedChain: ['Logistics Manager', 'Budget Manager', 'CEO', 'Purchase Manager'] },
  { workflowCode: 'GLB-COMBO-GENIT-60', categories: ['GENERAL', 'IT'], expectedChain: ['IT Manager', 'Budget Manager', 'Purchase Manager'] },
  { workflowCode: 'GLB-COMBO-ASTIT-61', categories: ['ASSET', 'IT'], expectedChain: ['IT Manager', 'Budget Manager', 'CEO', 'Purchase Manager'] },
  { workflowCode: 'GLB-COMBO-GENLOG-64', categories: ['GENERAL', 'LOGISTICS'], expectedChain: ['Logistics Manager', 'Budget Manager', 'Purchase Manager'] },
  { workflowCode: 'GLB-COMBO-ASTLOG-65', categories: ['ASSET', 'LOGISTICS'], expectedChain: ['Logistics Manager', 'Budget Manager', 'CEO', 'Purchase Manager'] },
  { workflowCode: 'GLB-COMBO-GENITLOGAST-66', categories: ['GENERAL', 'IT', 'LOGISTICS', 'ASSET'], expectedChain: ['IT Manager', 'Logistics Manager', 'Budget Manager', 'CEO', 'Purchase Manager'] },
];

async function approveRequest(page: Page, requestNumber: string) {
  const row = page.getByRole('row', { name: new RegExp(requestNumber) });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.getByRole('button', { name: /View/ }).click();
  await page.getByRole('button', { name: '✕', exact: true }).click();
  await row.getByRole('button', { name: '✓ Approve' }).click();
  const approveResponse = page.waitForResponse(
    resp => /\/api\/approvals\/.+\/approve/.test(resp.url()) && resp.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '✅ Confirm Approve' }).click();
  const response = await approveResponse;
  expect(response.ok(), `Approve API call failed with status ${response.status()}`).toBeTruthy();
}

for (const tc of TEST_CASES) {
  test(`${tc.workflowCode}: [${tc.categories.join('+')}] routes through Department Manager -> ${tc.expectedChain.join(' -> ')}`, async ({ page }) => {
    // 1. Requester creates the request with one item per category in this case
    await loginAs(page, process.env.REQUESTER_EMAIL!, process.env.REQUESTER_PASSWORD!);
    await page.getByRole('button', { name: 'Requests' }).click();
    await page.getByRole('link', { name: 'Create Request' }).click();

    await page.locator('div').filter({ hasText: /^Search project\.\.\.$/ }).nth(1).click();
    await page.getByText('SEC1150 — SS150 Al Rayyan for').click();

    await page.getByRole('textbox', { name: 'e.g. Main Store, Site A' }).fill('delivery');
    await page.getByRole('textbox', { name: 'e.g. +974 5555' }).fill('9879599');
    await page.getByRole('textbox', { name: 'Describe why this purchase is' }).fill(`Automated test - ${tc.workflowCode}`);

    for (const catKey of tc.categories) {
      const { tab, item } = CATEGORY_ITEMS[catKey];
      const itemCode = item.split(' — ')[0]; // e.g. "SEC00270" from "SEC00270 — Tyre..."
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.getByText('Search by code or name...').first().click();
      await page.keyboard.type(itemCode);
      await page.getByText(item).click();
      await page.getByRole('button', { name: '+ Add Item' }).click();
    }

    await page.getByRole('button', { name: 'Submit for Approval' }).click();

    await page.getByRole('link', { name: 'My Requests' }).click();
    const firstRequestCell = page.locator('table tbody tr').first();
    await expect(firstRequestCell).toBeVisible({ timeout: 10_000 });
    const rowText = await firstRequestCell.innerText();
    const requestNumberMatch = rowText.match(/\d{2}[A-Z]{2}\d+/);
    expect(requestNumberMatch, `Could not find a request number in row text: ${rowText}`).not.toBeNull();
    const requestNumber = requestNumberMatch![0];

    await logout(page);

    // 2. Department Manager (always first, always Jovita's actual manager)
    await loginAs(page, process.env.DEPT_MANAGER_EMAIL!, process.env.DEPT_MANAGER_PASSWORD!);
    await page.getByRole('button', { name: 'Requests' }).click();
    await page.getByRole('link', { name: 'Approvals' }).click();
    await approveRequest(page, requestNumber);
    await logout(page);

    // 3. Walk the rest of the expected chain dynamically
    for (const roleName of tc.expectedChain) {
      if (roleName === 'Purchase Manager') {
        // last step - handled after the loop with its own nav pattern
        continue;
      }
      const creds = ROLE_CREDENTIALS[roleName];
      await loginAs(page, creds.email, creds.password);
      await page.getByRole('button', { name: 'Requests' }).click();
      await page.getByRole('link', { name: 'Approvals' }).click();
      await approveRequest(page, requestNumber);
      await logout(page);
    }

    // 4. Purchase Manager - always last
    const pm = ROLE_CREDENTIALS['Purchase Manager'];
    await loginAs(page, pm.email, pm.password);
    await page.getByRole('button', { name: 'Requests' }).click();
    await page.getByRole('link', { name: 'Approvals' }).click();
    await approveRequest(page, requestNumber);
    await logout(page);

    // 5. Confirm fully approved
    await loginAs(page, process.env.REQUESTER_EMAIL!, process.env.REQUESTER_PASSWORD!);
    await page.getByRole('button', { name: 'Requests' }).click();
    await page.getByRole('link', { name: 'My Requests' }).click();
    const finalRow = page.getByRole('row', { name: new RegExp(requestNumber) });
    await expect(finalRow).toContainText(/Approved/i, { timeout: 10_000 });
  });
}