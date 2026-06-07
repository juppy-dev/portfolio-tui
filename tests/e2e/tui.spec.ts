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

test('t cycles theme and persists across reload', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'andromeda');
  await page.keyboard.press('t');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'catppuccin-mocha');
  await expect(page.locator('[data-theme-label]')).toHaveText('catppuccin-mocha');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'catppuccin-mocha');
});

test('clicking the status-bar theme button cycles theme', async ({ page }) => {
  await page.locator('[data-action="theme"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'catppuccin-mocha');
});

test('c opens the contact dialog and Esc closes it', async ({ page }) => {
  await page.keyboard.press('c');
  await expect(page.locator('#contact-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#contact-dialog')).toBeHidden();
});

test('typing inside the form does not trigger keybinds', async ({ page }) => {
  await page.keyboard.press('c');
  await page.locator('#contact-dialog [name="name"]').click();
  await page.keyboard.type('tttt'); // 't' would cycle the theme if keybinds leaked
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'andromeda');
  await expect(page.locator('#contact-dialog [name="name"]')).toHaveValue('tttt');
});

test('successful submit shows sent state', async ({ page }) => {
  await page.route('https://api.web3forms.com/submit', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' })
  );
  await page.keyboard.press('c');
  await page.locator('#contact-dialog [name="name"]').fill('Test');
  await page.locator('#contact-dialog [name="email"]').fill('test@example.com');
  await page.locator('#contact-dialog [name="message"]').fill('Hello');
  await page.locator('#contact-dialog button[type="submit"]').click();
  await expect(page.locator('#contact-status')).toContainText('message sent');
});

test('failed submit shows mailto fallback', async ({ page }) => {
  await page.route('https://api.web3forms.com/submit', (route) =>
    route.fulfill({ status: 500, body: '{}' })
  );
  await page.keyboard.press('c');
  await page.locator('#contact-dialog [name="name"]').fill('Test');
  await page.locator('#contact-dialog [name="email"]').fill('test@example.com');
  await page.locator('#contact-dialog [name="message"]').fill('Hello');
  await page.locator('#contact-dialog button[type="submit"]').click();
  await expect(page.locator('#contact-status')).toContainText('failed');
  await expect(page.locator('#contact-status a')).toHaveAttribute('href', /^mailto:/);
});

test('? opens help overlay listing keys; Esc closes', async ({ page }) => {
  await page.keyboard.press('?');
  await expect(page.locator('#help-dialog')).toBeVisible();
  await expect(page.locator('#help-dialog')).toContainText('tab');
  await expect(page.locator('#help-dialog')).toContainText('theme');
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
});
