import { expect, test } from '@playwright/test';

test('boot overlay shows on first visit, then panes appear', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#boot')).toBeVisible();
  await expect(page.locator('#boot pre')).toContainText('mounting panes');
  await expect(page.locator('#boot')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('#pane-about')).toBeVisible();
});

test('boot is skipped on second visit in the same session', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#boot')).toBeHidden({ timeout: 5000 });
  await page.reload();
  await expect(page.locator('#boot')).toBeHidden();
});

test('any key skips the boot sequence', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#boot')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('#boot')).toBeHidden();
});

test('prefers-reduced-motion skips boot entirely', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#boot')).toBeHidden();
});
