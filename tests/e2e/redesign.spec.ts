import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('booted', '1'));
  await page.goto('/');
});

test('hero renders banner and tagline', async ({ page }) => {
  await expect(page.locator('.hero-art')).toBeVisible();
  await expect(page.locator('.hero-tagline')).toContainText('hello@juppy.dev');
});
