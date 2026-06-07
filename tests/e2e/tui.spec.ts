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

test('j/k moves the subnav selection and reveals the matching content', async ({ page }) => {
  // Click the pane's padding corner, not the center — the center can land on
  // an entry (which would pre-select it) depending on viewport-driven layout.
  await page.locator('#pane-work').click({ position: { x: 8, y: 8 } });
  const entries = page.locator('[data-tab-panel="projects"] [data-entry]');
  // first item is pre-selected at render; j moves to the second
  await page.keyboard.press('j');
  await expect(entries.nth(1)).toHaveClass(/selected/);
  await expect(page.locator('[data-sub-panel="proj-1"]')).toBeVisible();
  await expect(page.locator('[data-sub-panel="proj-0"]')).toBeHidden();
  await page.keyboard.press('k');
  await expect(entries.nth(0)).toHaveClass(/selected/);
  await expect(page.locator('[data-sub-panel="proj-0"]')).toBeVisible();
});

test('clicking a subnav item reveals its content', async ({ page }) => {
  const second = page.locator('[data-tab-panel="projects"] [data-entry]').nth(1);
  await second.locator('.entry-line').click();
  await expect(page.locator('[data-sub-panel="proj-1"]')).toBeVisible();
  await expect(page.locator('[data-sub-panel="proj-0"]')).toBeHidden();
});

test('clicking a subnav item in an unfocused pane focuses the pane and selects it', async ({ page }) => {
  // pane-about is focused by default; click straight into the work pane
  const second = page.locator('[data-tab-panel="projects"] [data-entry]').nth(1);
  await second.locator('.entry-line').click();
  await expect(page.locator('#pane-work')).toHaveClass(/focused/);
  await expect(second).toHaveClass(/selected/);
  await expect(page.locator('[data-sub-panel="proj-1"]')).toBeVisible();
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

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('panes stack in one column; tabs remain tappable', async ({ page }) => {
    await page.goto('/');
    const about = await page.locator('#pane-about').boundingBox();
    const now = await page.locator('#pane-now').boundingBox();
    expect(about!.y).toBeLessThan(now!.y);
    expect(Math.abs(about!.x - now!.x)).toBeLessThan(2); // same column
    await page.locator('[data-tab="experience"]').tap();
    await expect(page.locator('[data-tab-panel="experience"]')).toBeVisible();
    await expect(page.locator('#resume-link')).toBeVisible();
  });
});
