import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('booted', '1'));
  await page.goto('/');
});

test('hero renders whoami prompt, banner, and tagline', async ({ page }) => {
  await expect(page.locator('.hero-prompt')).toHaveText('$ whoami');
  await expect(page.locator('.hero-art')).toBeVisible();
  await expect(page.locator('.hero-tagline')).toContainText('engineer');
});

test('header hire-me button opens the contact dialog', async ({ page }) => {
  await page.locator('.hire-me').click();
  await expect(page.locator('#contact-dialog')).toBeVisible();
});

test('new panes render and Tab reaches them', async ({ page }) => {
  for (const id of ['ps', 'uses', 'vitals']) {
    await expect(page.locator(`#pane-${id}`)).toBeVisible();
  }
  // Focus order: about → now → ps → work → tech → uses → vitals
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  await expect(page.locator('#pane-vitals')).toHaveClass(/focused/);
});

test('vitals heatmap renders intensity cells', async ({ page }) => {
  expect(await page.locator('.hm-cell').count()).toBeGreaterThan(10);
});

test('key 4 reaches certification; education lives there as a category', async ({ page }) => {
  await page.keyboard.press('4');
  const panel = page.locator('[data-tab-panel="certification"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Anthropic');
  // education is the last subnav category in the certification panel
  await panel.locator('[data-sub="cert-edu"] .entry-line').click();
  await expect(page.locator('[data-sub-panel="cert-edu"]')).toBeVisible();
  await expect(page.locator('[data-sub-panel="cert-edu"]')).toContainText('University');
});

test('highlights are grouped by category in a subnav', async ({ page }) => {
  await page.keyboard.press('3');
  const panel = page.locator('[data-tab-panel="highlights"]');
  await expect(panel.locator('.subnav [data-entry]').first()).toContainText('e-commerce');
  await panel.locator('.subnav [data-entry]', { hasText: 'leadership' }).locator('.entry-line').click();
  await expect(panel.locator('.sub-content:visible')).toContainText('Mentored');
});

test('status bar clock shows the time', async ({ page }) => {
  await expect(page.locator('[data-clock]')).toHaveText(/CES?T \d{2}:\d{2}/);
});
