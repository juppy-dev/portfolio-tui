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

test('status bar clock shows the time', async ({ page }) => {
  await expect(page.locator('[data-clock]')).toHaveText(/CES?T \d{2}:\d{2}/);
});
