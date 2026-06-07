import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('booted', '1'));
  await page.goto('/');
});

test('first pane is focused on load; Tab cycles panes', async ({ page }) => {
  await expect(page.locator('#pane-about')).toHaveClass(/focused/);
  await page.keyboard.press('Tab');
  await expect(page.locator('#pane-now')).toHaveClass(/focused/);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#pane-about')).toHaveClass(/focused/);
});

test('clicking a pane focuses it', async ({ page }) => {
  await page.locator('#pane-tech').click();
  await expect(page.locator('#pane-tech')).toHaveClass(/focused/);
});

test('number keys switch work-pane tabs', async ({ page }) => {
  await page.keyboard.press('2');
  await expect(page.locator('[data-tab="experience"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-tab-panel="experience"]')).toBeVisible();
  await expect(page.locator('[data-tab-panel="projects"]')).toBeHidden();
  await page.keyboard.press('1');
  await expect(page.locator('[data-tab-panel="projects"]')).toBeVisible();
});

test('j/k moves selection and Enter expands details', async ({ page }) => {
  await page.locator('#pane-work').click();
  await page.keyboard.press('j');
  const first = page.locator('[data-tab-panel="projects"] [data-entry]').first();
  await expect(first).toHaveClass(/selected/);
  await page.keyboard.press('Enter');
  await expect(first.locator('[data-entry-details]')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(first.locator('[data-entry-details]')).toBeHidden();
});

test('clicking an entry expands it', async ({ page }) => {
  const first = page.locator('[data-tab-panel="projects"] [data-entry]').first();
  await first.locator('.entry-line').click();
  await expect(first.locator('[data-entry-details]')).toBeVisible();
});

test('clicking an entry in an unfocused pane focuses the pane and selects the entry', async ({ page }) => {
  // pane-about is focused by default; click straight into the work pane
  const first = page.locator('[data-tab-panel="projects"] [data-entry]').first();
  await first.locator('.entry-line').click();
  await expect(page.locator('#pane-work')).toHaveClass(/focused/);
  await expect(first).toHaveClass(/selected/);
  await expect(first.locator('[data-entry-details]')).toBeVisible();
});
