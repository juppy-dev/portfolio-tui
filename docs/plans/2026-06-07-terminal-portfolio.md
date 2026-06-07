# Terminal-Style Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page portfolio styled as a keyboard-navigable multi-pane terminal UI (charmbracelet/ratatui aesthetic), content-managed via Keystatic, deployed static on Cloudflare Pages.

**Architecture:** Astro 6 renders all content to static HTML at build time from YAML files in `content/` (edited via the Keystatic admin at `/keystatic` in local dev only — excluded from production builds via `SKIP_KEYSTATIC`). One vanilla TypeScript module (`src/scripts/tui.ts`) provides the TUI layer: pane focus, keyboard map, tabs, theme switcher, contact modal, boot sequence. All theming via CSS custom properties.

**Tech Stack:** Astro ^6.4, @keystatic/astro ^5.1 + @keystatic/core ^0.5.50, vanilla TS, Vitest ^4, Playwright ^1.60, Web3Forms, Cloudflare Pages.

**Spec:** `docs/specs/2026-06-07-terminal-portfolio-design.md`

---

## File map

| Path | Responsibility |
|---|---|
| `package.json`, `astro.config.mjs`, `tsconfig.json` | project scaffold |
| `keystatic.config.ts` | content schema (singletons: about, now, highlights, tech; collections: projects, experience) |
| `content/**` | YAML content (Keystatic-managed) |
| `src/lib/content.ts` | typed reader helpers, sorting, empty/missing handling |
| `src/styles/themes.css` | 5 theme palettes as CSS custom properties |
| `src/styles/global.css` | terminal chrome, grid, panes, tabs, dialogs, mobile |
| `src/components/Pane.astro` | bordered TUI pane with inset title |
| `src/components/NowPane.astro` | macchina-style art + key/value rows |
| `src/components/WorkPane.astro` | tabbed projects/experience/highlights + resume link |
| `src/components/ContactDialog.astro` | contact modal (Web3Forms) |
| `src/components/HelpDialog.astro` | keybinding help overlay |
| `src/pages/index.astro` | the single page; head scripts; boot overlay; status bar |
| `src/scripts/tui.ts` | all client-side TUI behavior |
| `tests/unit/content.test.ts` | Vitest for content helpers |
| `tests/e2e/tui.spec.ts`, `tests/e2e/boot.spec.ts` | Playwright smoke tests |
| `.github/workflows/ci.yml` | build + unit + e2e |
| `public/resume.pdf` | static resume (user-supplied) |

---

### Task 1: Scaffold project & tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `src/pages/index.astro` (placeholder)
- Modify: `.gitignore`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "portfolio-v2",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@astrojs/markdoc": "^1.0.6",
    "@astrojs/react": "^5.0.7",
    "@keystatic/astro": "^5.1.0",
    "@keystatic/core": "^0.5.50",
    "astro": "^6.4.4",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.60.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.8"
  }
}
```

- [ ] **Step 2: Write `astro.config.mjs`** (Keystatic integration is added in Task 2 — react/markdoc only for now)

```js
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';

export default defineConfig({
  integrations: [react(), markdoc()],
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 6: Write placeholder `src/pages/index.astro`**

```astro
---
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>portfolio</title>
  </head>
  <body>
    <p>boot pending…</p>
  </body>
</html>
```

- [ ] **Step 7: Append to `.gitignore`**

```gitignore
# env (Web3Forms key lives here locally)
.env

# tooling artifacts
.astro/
playwright-report/
test-results/
```

- [ ] **Step 8: Install dependencies and Playwright browser**

Run: `npm install && npx playwright install chromium`
Expected: clean install, no peer-dependency errors (`@keystatic/astro@5.1.x` accepts `astro@6`).

- [ ] **Step 9: Verify the build works**

Run: `npm run build`
Expected: `Complete!` with `dist/index.html` generated.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts playwright.config.ts src/pages/index.astro .gitignore
git commit -m "feat: scaffold Astro 6 project with test tooling"
```

---

### Task 2: Keystatic schema & seed content

**Files:**
- Create: `keystatic.config.ts`, `content/about.yaml`, `content/now.yaml`, `content/highlights.yaml`, `content/tech.yaml`, `content/projects/portfolio-v2.yaml`, `content/experience/onearrow.yaml`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Write `keystatic.config.ts`**

Note: link URLs use `fields.text` (not `fields.url`) so `mailto:` links validate.

```ts
import { config, fields, collection, singleton } from '@keystatic/core';

const links = fields.array(
  fields.object({
    label: fields.text({ label: 'Label' }),
    url: fields.text({ label: 'URL' }),
  }),
  { label: 'Links', itemLabel: (props) => props.fields.label.value }
);

export default config({
  storage: { kind: 'local' },
  singletons: {
    about: singleton({
      label: 'About',
      path: 'content/about',
      format: { data: 'yaml' },
      schema: {
        name: fields.text({ label: 'Name' }),
        intro: fields.text({ label: 'Intro', multiline: true }),
        links,
      },
    }),
    now: singleton({
      label: 'Now',
      path: 'content/now',
      format: { data: 'yaml' },
      schema: {
        art: fields.text({
          label: 'ASCII art',
          multiline: true,
          description: 'Rendered beside the rows, macchina-style. Leave empty for none.',
        }),
        artColor: fields.select({
          label: 'Art color',
          options: [
            { label: 'Accent', value: 'accent' },
            { label: 'Cyan', value: 'cyan' },
            { label: 'Violet', value: 'violet' },
            { label: 'Blue', value: 'blue' },
            { label: 'Green', value: 'green' },
            { label: 'Yellow', value: 'yellow' },
            { label: 'Red', value: 'red' },
          ],
          defaultValue: 'accent',
        }),
        rows: fields.array(
          fields.object({
            key: fields.text({ label: 'Key' }),
            value: fields.text({ label: 'Value' }),
          }),
          {
            label: 'Rows',
            itemLabel: (props) =>
              `${props.fields.key.value}: ${props.fields.value.value}`,
          }
        ),
      },
    }),
    highlights: singleton({
      label: 'Highlights',
      path: 'content/highlights',
      format: { data: 'yaml' },
      schema: {
        items: fields.array(
          fields.object({
            text: fields.text({ label: 'Highlight' }),
            year: fields.text({ label: 'Year' }),
          }),
          { label: 'Highlights', itemLabel: (props) => props.fields.text.value }
        ),
      },
    }),
    tech: singleton({
      label: 'Tech',
      path: 'content/tech',
      format: { data: 'yaml' },
      schema: {
        groups: fields.array(
          fields.object({
            name: fields.text({ label: 'Group' }),
            items: fields.array(fields.text({ label: 'Item' }), {
              label: 'Items',
              itemLabel: (props) => props.value,
            }),
          }),
          { label: 'Groups', itemLabel: (props) => props.fields.name.value }
        ),
      },
    }),
  },
  collections: {
    projects: collection({
      label: 'Projects',
      slugField: 'name',
      path: 'content/projects/*',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        blurb: fields.text({ label: 'One-line blurb' }),
        details: fields.text({ label: 'Details', multiline: true }),
        year: fields.text({ label: 'Year' }),
        links,
      },
    }),
    experience: collection({
      label: 'Experience',
      slugField: 'role',
      path: 'content/experience/*',
      format: { data: 'yaml' },
      schema: {
        role: fields.slug({ name: { label: 'Role' } }),
        company: fields.text({ label: 'Company' }),
        period: fields.text({ label: 'Period', description: 'e.g. 2023 — now' }),
        order: fields.integer({
          label: 'Sort order',
          description: 'Lower = listed first',
          defaultValue: 0,
        }),
        bullets: fields.array(fields.text({ label: 'Bullet' }), {
          label: 'Bullets',
          itemLabel: (props) => props.value,
        }),
      },
    }),
  },
});
```

- [ ] **Step 2: Add Keystatic to `astro.config.mjs`** (conditionally — excluded in production via `SKIP_KEYSTATIC`, per the official Keystatic recipe; keeps the production build fully static, no adapter)

```js
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';

export default defineConfig({
  integrations: [
    react(),
    markdoc(),
    ...(process.env.SKIP_KEYSTATIC ? [] : [keystatic()]),
  ],
});
```

- [ ] **Step 3: Write seed content** (placeholder copy — the user edits real content via Keystatic later)

`content/about.yaml`:

```yaml
name: Paolo
intro: |-
  Hi, I'm Paolo — engineer building things for the web.
  This site is a terminal because every site I love is a terminal at heart.
links:
  - label: github
    url: https://github.com/REPLACE_ME
  - label: email
    url: mailto:paolo@onearrow.io
```

`content/now.yaml`:

```yaml
art: |-
   /\_/\
  ( o.o )
   > ^ <
artColor: accent
rows:
  - key: Building
    value: this site
  - key: Learning
    value: rust
  - key: Status
    value: open to interesting work
```

`content/highlights.yaml`:

```yaml
items:
  - text: Replace with a real career highlight
    year: '2024'
```

`content/tech.yaml`:

```yaml
groups:
  - name: languages
    items:
      - typescript
      - python
  - name: tools
    items:
      - astro
      - docker
```

`content/projects/portfolio-v2.yaml`:

```yaml
name: portfolio-v2
blurb: you are here
details: |-
  Terminal-style single-page portfolio. Astro + Keystatic + ~200 lines of vanilla TS.
year: '2026'
links: []
```

`content/experience/engineer.yaml`:

```yaml
role: Engineer
company: onearrow.io
period: 2023 — now
order: 0
bullets:
  - Replace with real responsibilities via /keystatic
```

- [ ] **Step 4: Verify the Keystatic admin loads in dev**

Run: `npm run dev` then open `http://localhost:4321/keystatic`
Expected: Keystatic dashboard listing About, Now, Highlights, Tech, Projects, Experience. Open "Now" and confirm art/artColor/rows fields render. Stop the server.

- [ ] **Step 5: Verify the production build excludes Keystatic**

Run: `SKIP_KEYSTATIC=true npm run build`
Expected: build succeeds; no `keystatic` route in output (`ls dist` shows no keystatic dir).

- [ ] **Step 6: Commit**

```bash
git add keystatic.config.ts astro.config.mjs content/
git commit -m "feat(content): add Keystatic schema and seed content"
```

---

### Task 3: Content helpers (Vitest, TDD)

**Files:**
- Create: `tests/unit/content.test.ts`, `tests/fixtures/empty/content/projects/.gitkeep`, `src/lib/content.ts`

- [ ] **Step 1: Create the empty fixture**

Run: `mkdir -p tests/fixtures/empty/content/projects && touch tests/fixtures/empty/content/projects/.gitkeep`

- [ ] **Step 2: Write the failing tests** — `tests/unit/content.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  getAbout,
  getExperience,
  getHighlights,
  getNow,
  getProjects,
  getTech,
} from '../../src/lib/content';

const EMPTY = 'tests/fixtures/empty';

describe('content helpers', () => {
  it('reads the about singleton', async () => {
    const about = await getAbout();
    expect(about.name).toBeTruthy();
    expect(about.intro).toBeTruthy();
    expect(Array.isArray(about.links)).toBe(true);
  });

  it('reads now rows and art', async () => {
    const now = await getNow();
    expect(now.rows.length).toBeGreaterThan(0);
    expect(typeof now.art).toBe('string');
  });

  it('sorts projects by year descending', async () => {
    const projects = await getProjects();
    const years = projects.map((p) => p.year ?? '');
    expect(years).toEqual([...years].sort().reverse());
  });

  it('sorts experience by order ascending', async () => {
    const exp = await getExperience();
    const orders = exp.map((e) => e.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('returns [] for empty collections and optional singletons', async () => {
    expect(await getProjects(EMPTY)).toEqual([]);
    expect(await getExperience(EMPTY)).toEqual([]);
    expect(await getHighlights(EMPTY)).toEqual([]);
    expect(await getTech(EMPTY)).toEqual([]);
  });

  it('throws loudly when required singletons are missing', async () => {
    await expect(getAbout(EMPTY)).rejects.toThrow(/about/);
    await expect(getNow(EMPTY)).rejects.toThrow(/now/);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../../src/lib/content`.

- [ ] **Step 4: Write `src/lib/content.ts`**

```ts
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

function reader(dir = process.cwd()) {
  return createReader(dir, keystaticConfig);
}

/** Required singleton — the page's spine. Build fails loudly if missing. */
export async function getAbout(dir?: string) {
  const about = await reader(dir).singletons.about.read();
  if (!about) throw new Error('Missing required content: about (content/about.yaml)');
  return about;
}

/** Required singleton — the page's spine. Build fails loudly if missing. */
export async function getNow(dir?: string) {
  const now = await reader(dir).singletons.now.read();
  if (!now) throw new Error('Missing required content: now (content/now.yaml)');
  return now;
}

export async function getHighlights(dir?: string) {
  return (await reader(dir).singletons.highlights.read())?.items ?? [];
}

export async function getTech(dir?: string) {
  return (await reader(dir).singletons.tech.read())?.groups ?? [];
}

export async function getProjects(dir?: string) {
  const entries = await reader(dir).collections.projects.all();
  return entries
    .map((e) => e.entry)
    .sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''));
}

export async function getExperience(dir?: string) {
  const entries = await reader(dir).collections.experience.all();
  return entries.map((e) => e.entry).sort((a, b) => a.order - b.order);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/content.test.ts tests/fixtures/ src/lib/content.ts
git commit -m "feat(content): add typed reader helpers with sorting and missing-content guards"
```

---

### Task 4: Themes & page shell

**Files:**
- Create: `src/styles/themes.css`, `src/styles/global.css`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Write `src/styles/themes.css`**

Variables: `--bg` page background, `--bg-alt` bars, `--fg` body text, `--dim` secondary, `--border` idle pane borders, `--accent` focused border + highlights, plus six named palette colors used by content (`--red --green --yellow --blue --violet --cyan`).

```css
/* Default: Tokyo Nebula Andromeda (user's ghostty theme).
   Body text promoted to palette 7 (#c0caf5) for web readability;
   the theme's true foreground (#787c99) serves as --dim. */
:root,
[data-theme='andromeda'] {
  --bg: #16161e;
  --bg-alt: #0a0c14;
  --fg: #c0caf5;
  --dim: #787c99;
  --border: #3b4261;
  --accent: #00d4ff;
  --red: #ff6188;
  --green: #7ce38b;
  --yellow: #ffd866;
  --blue: #7aa2f7;
  --violet: #a78bfa;
  --cyan: #00d4ff;
}

[data-theme='catppuccin-mocha'] {
  --bg: #1e1e2e;
  --bg-alt: #181825;
  --fg: #cdd6f4;
  --dim: #6c7086;
  --border: #45475a;
  --accent: #cba6f7;
  --red: #f38ba8;
  --green: #a6e3a1;
  --yellow: #f9e2af;
  --blue: #89b4fa;
  --violet: #cba6f7;
  --cyan: #94e2d5;
}

[data-theme='gruvbox-dark'] {
  --bg: #282828;
  --bg-alt: #1d2021;
  --fg: #ebdbb2;
  --dim: #928374;
  --border: #504945;
  --accent: #fabd2f;
  --red: #fb4934;
  --green: #b8bb26;
  --yellow: #fabd2f;
  --blue: #83a598;
  --violet: #d3869b;
  --cyan: #8ec07c;
}

[data-theme='tokyo-night'] {
  --bg: #1a1b26;
  --bg-alt: #16161e;
  --fg: #c0caf5;
  --dim: #565f89;
  --border: #3b4261;
  --accent: #7aa2f7;
  --red: #f7768e;
  --green: #9ece6a;
  --yellow: #e0af68;
  --blue: #7aa2f7;
  --violet: #bb9af7;
  --cyan: #7dcfff;
}

[data-theme='green-phosphor'] {
  --bg: #0a0e0a;
  --bg-alt: #0f140f;
  --fg: #9ece9e;
  --dim: #3e5c3e;
  --border: #1d4022;
  --accent: #33ff66;
  --red: #ffb347; /* amber stands in for red on the monochrome CRT */
  --green: #33ff66;
  --yellow: #aaffaa;
  --blue: #6fbf7f;
  --violet: #6fbf7f;
  --cyan: #aaffaa;
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  height: 100%;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 15px;
  line-height: 1.5;
}

a {
  color: var(--blue);
}

button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

kbd {
  color: var(--yellow);
  font-family: inherit;
}

.dim {
  color: var(--dim);
}

:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

/* ---- app frame ---- */
.app {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 8px;
  height: 100dvh;
  padding: 8px;
}

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: var(--bg-alt);
  color: var(--dim);
  border-radius: 4px;
  padding: 4px 12px;
}

.bar .ok {
  color: var(--green);
}

.bar .mode {
  color: var(--violet);
}

.bar button:hover kbd,
.bar button:hover {
  color: var(--fg);
}

.hints {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* ---- pane grid ---- */
.grid {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 2fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    'about work'
    'now   work'
    'now   tech';
  gap: 8px;
  min-height: 0;
}

#pane-about { grid-area: about; }
#pane-now   { grid-area: now; }
#pane-work  { grid-area: work; }
#pane-tech  { grid-area: tech; }

/* ---- panes ---- */
.pane {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem 0.85rem 0.65rem;
  min-height: 0;
  overflow: auto;
}

.pane:focus {
  outline: none;
}

.pane-title {
  position: absolute;
  top: -0.75em;
  left: 0.75rem;
  margin: 0;
  padding: 0 0.4em;
  background: var(--bg);
  color: var(--violet);
  font-size: 0.85rem;
  font-weight: 700;
}

.pane.focused {
  border-color: var(--accent);
}

.pane.focused .pane-title {
  color: var(--accent);
}

/* blinking block cursor on the focused pane title */
.pane.focused .pane-title::after {
  content: '█';
  margin-left: 2px;
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .pane.focused .pane-title::after {
    animation: none;
  }
}

/* ---- tabs ---- */
.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.tabs [role='tab'] {
  color: var(--dim);
  padding-bottom: 1px;
}

.tabs [role='tab'][aria-selected='true'] {
  color: var(--yellow);
  border-bottom: 1px solid var(--yellow);
}

/* ---- entry lists ---- */
.entries {
  list-style: none;
  margin: 0;
  padding: 0;
}

.entries .entry-line {
  display: block;
  width: 100%;
  text-align: left;
  padding: 1px 4px;
  border-radius: 3px;
}

.entries [data-entry].selected > .entry-line {
  background: var(--bg-alt);
}

.entries .marker {
  color: var(--yellow);
}

.entries [data-entry-details] {
  padding: 0.25rem 0 0.5rem 1.25rem;
  color: var(--dim);
  white-space: pre-line;
}

.entries [data-entry-details] a {
  margin-right: 0.5rem;
}

/* ---- now pane ---- */
.now {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.now-art {
  margin: 0;
  line-height: 1.2;
}

.now-rows {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0 1rem;
}

.now-rows dt {
  color: var(--blue);
}

.now-rows dd {
  margin: 0;
}

/* ---- tech pane ---- */
.tech-group {
  margin-bottom: 0.4rem;
}

.tech-group .label {
  color: var(--blue);
  margin-right: 0.5rem;
}

.badge {
  display: inline-block;
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0 0.4em;
  margin: 1px 2px;
  color: var(--fg);
}

/* ---- dialogs ---- */
dialog {
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 1.25rem;
  min-width: min(480px, 90vw);
}

dialog::backdrop {
  background: rgb(0 0 0 / 0.6);
}

dialog h2 {
  margin-top: 0;
  font-size: 1rem;
  color: var(--accent);
}

dialog form {
  display: grid;
  gap: 0.6rem;
}

dialog input,
dialog textarea {
  font: inherit;
  background: var(--bg-alt);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.4rem 0.6rem;
}

dialog input:focus,
dialog textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-actions button[type='submit'] {
  color: var(--green);
}

#contact-status .err {
  color: var(--red);
}

#contact-status .sent {
  color: var(--green);
}

.keys-table td {
  padding: 1px 0.75rem 1px 0;
}

/* ---- boot overlay ---- */
#boot {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: var(--bg);
  padding: 2rem;
}

#boot pre {
  color: var(--green);
  margin: 0;
}

.no-boot #boot {
  display: none;
}

/* ---- about pane intro cursor ---- */
.intro-cursor::after {
  content: '█';
  color: var(--accent);
  animation: blink 1s steps(1) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .intro-cursor::after {
    animation: none;
  }
}

/* ---- mobile (Task 12 adjusts further) ---- */
@media (max-width: 800px) {
  .app {
    height: auto;
    min-height: 100dvh;
  }

  .grid {
    grid-template-columns: 1fr;
    grid-template-areas: 'about' 'now' 'work' 'tech';
    grid-template-rows: none;
  }

  .status-bar {
    position: sticky;
    bottom: 8px;
  }

  /* art stacks above the rows on narrow screens (spec) */
  .now {
    flex-direction: column;
  }

  .desktop-hints {
    display: none;
  }
}

@media (max-width: 360px) {
  .now-art {
    display: none;
  }
}
```

- [ ] **Step 3: Rewrite `src/pages/index.astro` as the page shell** (panes are placeholders; filled in Tasks 5–6)

```astro
---
import '../styles/themes.css';
import '../styles/global.css';
import { getAbout } from '../lib/content';

const about = await getAbout();
const user = about.name.toLowerCase();
---

<!doctype html>
<html lang="en" data-theme="andromeda">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={`${about.name} — portfolio`} />
    <title>{user}@portfolio</title>
    <script is:inline>
      // Apply persisted theme + skip boot before first paint (no flash).
      const t = localStorage.getItem('theme');
      if (t) document.documentElement.dataset.theme = t;
      if (
        sessionStorage.getItem('booted') ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        document.documentElement.classList.add('no-boot');
      }
    </script>
  </head>
  <body>
    <div id="boot" aria-hidden="true"><pre></pre></div>

    <div class="app">
      <header class="bar">
        <span><span class="ok">●</span> {user}@portfolio</span>
        <span class="dim">~/v2</span>
      </header>

      <main class="grid">
        <!-- panes land here in Tasks 5-6 -->
      </main>

      <footer class="bar status-bar">
        <span class="hints">
          <span class="desktop-hints"><kbd>tab</kbd> pane · <kbd>1-3</kbd> tabs · <kbd>j/k</kbd> nav</span>
          <button data-action="contact"><kbd>c</kbd> contact</button>
          <button data-action="theme"><kbd>t</kbd> <span data-theme-label>andromeda</span></button>
          <button data-action="help"><kbd>?</kbd> help</button>
        </span>
        <span class="mode">NORMAL</span>
      </footer>
    </div>

    <script>
      import '../scripts/tui.ts';
    </script>
  </body>
</html>
```

Note: `src/scripts/tui.ts` doesn't exist yet — create it as an empty placeholder so the build passes:

```ts
// TUI behavior lands in Task 7.
export {};
```

- [ ] **Step 4: Verify**

Run: `SKIP_KEYSTATIC=true npm run build`
Expected: build succeeds.
Run: `npm run dev`, open `http://localhost:4321` — header bar, status bar, empty grid, Andromeda colors. The boot overlay covers the page (it never clears yet — expected until Task 11; add `sessionStorage.setItem('booted','1')` in devtools and reload to see through it, or temporarily comment the overlay div while eyeballing).

- [ ] **Step 5: Commit**

```bash
git add src/styles/ src/pages/index.astro src/scripts/tui.ts
git commit -m "feat(ui): add theme palettes and terminal page shell"
```

---

### Task 5: Identity panes (about, now, tech)

**Files:**
- Create: `src/components/Pane.astro`, `src/components/NowPane.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Write `src/components/Pane.astro`**

```astro
---
interface Props {
  title: string;
  id: string;
}
const { title, id } = Astro.props;
---

<section class="pane" id={`pane-${id}`} data-pane={id} tabindex="-1" aria-label={title}>
  <h2 class="pane-title">{title}</h2>
  <slot />
</section>
```

- [ ] **Step 2: Write `src/components/NowPane.astro`**

```astro
---
import Pane from './Pane.astro';
import { getNow } from '../lib/content';

const now = await getNow();
---

<Pane title="now" id="now">
  <div class="now">
    {now.art && (
      <pre class="now-art" aria-hidden="true" style={`color: var(--${now.artColor})`}>{now.art}</pre>
    )}
    <dl class="now-rows">
      {now.rows.map((row) => (
        <>
          <dt>{row.key}</dt>
          <dd>{row.value}</dd>
        </>
      ))}
    </dl>
  </div>
</Pane>
```

- [ ] **Step 3: Add about/now/tech panes to `src/pages/index.astro`**

Extend the frontmatter imports:

```astro
import Pane from '../components/Pane.astro';
import NowPane from '../components/NowPane.astro';
import { getAbout, getTech } from '../lib/content';

const about = await getAbout();
const tech = await getTech();
const user = about.name.toLowerCase();
```

Replace the `<main class="grid">` placeholder comment with:

```astro
<Pane title="about" id="about">
  <p style="white-space: pre-line">{about.intro}<span class="intro-cursor"></span></p>
  <p>
    {about.links.map((l) => (
      <a href={l.url}>[{l.label}]</a>
    ))}
  </p>
</Pane>

<NowPane />

<Pane title="tech" id="tech">
  {tech.length === 0 && <p class="dim">// nothing here yet</p>}
  {tech.map((group) => (
    <div class="tech-group">
      <span class="label">{group.name}</span>
      {group.items.map((item) => (
        <span class="badge">{item}</span>
      ))}
    </div>
  ))}
</Pane>
```

- [ ] **Step 4: Verify**

Run: `npm run dev`, open `http://localhost:4321` (with `booted` set in sessionStorage)
Expected: about pane with intro + blinking cursor + links; now pane with colored ASCII art beside blue keys/values; tech pane with grouped badges.
Run: `SKIP_KEYSTATIC=true npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/Pane.astro src/components/NowPane.astro src/pages/index.astro
git commit -m "feat(ui): render about, now (macchina-style), and tech panes"
```

---

### Task 6: Work pane (tabs, entries, resume)

**Files:**
- Create: `src/components/WorkPane.astro`, `public/resume.pdf`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Write `src/components/WorkPane.astro`**

```astro
---
import Pane from './Pane.astro';
import { getExperience, getHighlights, getProjects } from '../lib/content';

const projects = await getProjects();
const experience = await getExperience();
const highlights = await getHighlights();
const tabs = ['projects', 'experience', 'highlights'] as const;
---

<Pane title="work" id="work">
  <div class="tabs" role="tablist" aria-label="work sections">
    {tabs.map((tab, i) => (
      <button role="tab" data-tab={tab} aria-selected={i === 0 ? 'true' : 'false'}>
        {i + 1}:{tab}
      </button>
    ))}
  </div>

  <div data-tab-panel="projects" role="tabpanel">
    {projects.length === 0 && <p class="dim">// nothing here yet</p>}
    <ul class="entries">
      {projects.map((p) => (
        <li data-entry>
          <button class="entry-line" aria-expanded="false">
            <span class="marker">▸</span> {p.name}
            {p.blurb && <span class="dim"> — {p.blurb}</span>}
            {p.year && <span class="dim"> ({p.year})</span>}
          </button>
          <div data-entry-details hidden>
            {p.details}
            {p.links.length > 0 && (
              <p>
                {p.links.map((l) => (
                  <a href={l.url}>[{l.label}]</a>
                ))}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  </div>

  <div data-tab-panel="experience" role="tabpanel" hidden>
    <p><a id="resume-link" href="/resume.pdf" download>[↓ resume.pdf]</a> <span class="dim desktop-hints">(or press d)</span></p>
    {experience.length === 0 && <p class="dim">// nothing here yet</p>}
    <ul class="entries">
      {experience.map((e) => (
        <li data-entry>
          <button class="entry-line" aria-expanded="false">
            <span class="marker">▸</span> {e.role} <span class="dim">@ {e.company}</span>
            <span class="dim"> · {e.period}</span>
          </button>
          <div data-entry-details hidden>
            {e.bullets.map((b) => `• ${b}`).join('\n')}
          </div>
        </li>
      ))}
    </ul>
  </div>

  <div data-tab-panel="highlights" role="tabpanel" hidden>
    {highlights.length === 0 && <p class="dim">// nothing here yet</p>}
    <ul class="entries">
      {highlights.map((h) => (
        <li>
          <span style="color: var(--yellow)">★</span> {h.text}
          {h.year && <span class="dim"> ({h.year})</span>}
        </li>
      ))}
    </ul>
  </div>
</Pane>
```

- [ ] **Step 2: Add the work pane to `src/pages/index.astro`**

Frontmatter: `import WorkPane from '../components/WorkPane.astro';`
Inside `<main class="grid">`, after `<NowPane />`: `<WorkPane />`

- [ ] **Step 3: Add a placeholder `public/resume.pdf`**

Run:

```bash
mkdir -p public && printf '%%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%%%EOF\n' > public/resume.pdf
```

(Minimal valid PDF; the user replaces it with their real resume.)

- [ ] **Step 4: Verify**

Run: `npm run dev` — work pane shows three tabs; projects tab listed by default; experience tab markup present (hidden); resume link present.
Run: `SKIP_KEYSTATIC=true npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/WorkPane.astro src/pages/index.astro public/resume.pdf
git commit -m "feat(ui): add tabbed work pane with projects, experience, highlights, resume"
```

---

### Task 7: TUI core — pane focus, tabs, selection (Playwright TDD)

**Files:**
- Create: `tests/e2e/tui.spec.ts`
- Modify: `src/scripts/tui.ts`

- [ ] **Step 1: Write the failing tests** — `tests/e2e/tui.spec.ts`

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:e2e`
Expected: FAIL — no `.focused` class, tabs don't switch.

- [ ] **Step 3: Replace `src/scripts/tui.ts` with the TUI core**

```ts
// ---- helpers ----
function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement;
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
}

// ---- pane focus ----
const panes = [...document.querySelectorAll<HTMLElement>('[data-pane]')];
let focusIdx = 0;

function focusPane(i: number): void {
  focusIdx = (i + panes.length) % panes.length;
  panes.forEach((p, idx) => p.classList.toggle('focused', idx === focusIdx));
  panes[focusIdx].focus({ preventScroll: true });
}

panes.forEach((p, i) => p.addEventListener('click', () => focusPane(i)));

// ---- tabs ----
const TAB_ORDER = ['projects', 'experience', 'highlights'];
const tabButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-tab]')];

function activeTab(): string {
  return tabButtons.find((b) => b.getAttribute('aria-selected') === 'true')?.dataset.tab ?? TAB_ORDER[0];
}

function switchTab(name: string): void {
  tabButtons.forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.tab === name))
  );
  document
    .querySelectorAll<HTMLElement>('[data-tab-panel]')
    .forEach((p) => (p.hidden = p.dataset.tabPanel !== name));
}

tabButtons.forEach((b) =>
  b.addEventListener('click', () => switchTab(b.dataset.tab!))
);

// ---- entry selection (j/k + Enter in the focused pane) ----
function visibleEntries(): HTMLElement[] {
  return [...panes[focusIdx].querySelectorAll<HTMLElement>('[data-entry]')].filter(
    (el) => el.offsetParent !== null
  );
}

function moveSelection(delta: number): void {
  const entries = visibleEntries();
  if (entries.length === 0) {
    panes[focusIdx].scrollBy({ top: delta * 48 });
    return;
  }
  const current = entries.findIndex((el) => el.classList.contains('selected'));
  const next = Math.min(Math.max(current + delta, 0), entries.length - 1);
  entries.forEach((el, i) => el.classList.toggle('selected', i === next));
  entries[next].scrollIntoView({ block: 'nearest' });
}

function toggleEntry(entry: HTMLElement): void {
  const details = entry.querySelector<HTMLElement>('[data-entry-details]');
  const line = entry.querySelector<HTMLElement>('.entry-line');
  if (!details) return;
  details.hidden = !details.hidden;
  line?.setAttribute('aria-expanded', String(!details.hidden));
}

function toggleSelected(): void {
  const selected = visibleEntries().find((el) => el.classList.contains('selected'));
  if (selected) toggleEntry(selected);
}

document.querySelectorAll<HTMLElement>('[data-entry] .entry-line').forEach((line) =>
  line.addEventListener('click', () => {
    const entry = line.closest<HTMLElement>('[data-entry]')!;
    visibleEntries().forEach((el) => el.classList.toggle('selected', el === entry));
    toggleEntry(entry);
  })
);

// ---- keyboard map ----
document.addEventListener('keydown', (e) => {
  if (isTyping(e)) return; // never steal keys from form fields
  if (document.querySelector('dialog[open]')) return; // dialogs own their keys (Esc closes natively)

  switch (e.key) {
    case 'Tab':
      e.preventDefault();
      focusPane(focusIdx + (e.shiftKey ? -1 : 1));
      break;
    case '1':
    case '2':
    case '3':
      switchTab(TAB_ORDER[Number(e.key) - 1]);
      break;
    case 'j':
    case 'ArrowDown':
      e.preventDefault();
      moveSelection(1);
      break;
    case 'k':
    case 'ArrowUp':
      e.preventDefault();
      moveSelection(-1);
      break;
    case 'Enter':
      toggleSelected();
      break;
    case 'd':
      if (activeTab() === 'experience') {
        document.querySelector<HTMLAnchorElement>('#resume-link')?.click();
      }
      break;
  }
});

// ---- init ----
focusPane(0);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:e2e`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/tui.spec.ts src/scripts/tui.ts
git commit -m "feat(tui): keyboard pane focus, tab switching, and entry selection"
```

---

### Task 8: Theme switcher (Playwright TDD)

**Files:**
- Modify: `tests/e2e/tui.spec.ts`, `src/scripts/tui.ts`

- [ ] **Step 1: Add failing tests to `tests/e2e/tui.spec.ts`**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:e2e`
Expected: the two new tests FAIL (theme never changes).

- [ ] **Step 3: Add the theme switcher to `src/scripts/tui.ts`**

Append after the entry-selection section (before the keyboard map):

```ts
// ---- theme switcher ----
const THEMES = [
  'andromeda',
  'catppuccin-mocha',
  'gruvbox-dark',
  'tokyo-night',
  'green-phosphor',
];

function syncThemeLabel(): void {
  const label = document.querySelector('[data-theme-label]');
  if (label) label.textContent = document.documentElement.dataset.theme ?? THEMES[0];
}

function cycleTheme(): void {
  const current = document.documentElement.dataset.theme ?? THEMES[0];
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  syncThemeLabel();
}

document
  .querySelector('[data-action="theme"]')
  ?.addEventListener('click', cycleTheme);
```

Add to the keyboard map `switch`:

```ts
    case 't':
      cycleTheme();
      break;
```

Add to init (after `focusPane(0)`):

```ts
syncThemeLabel();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:e2e`
Expected: all pass (theme persistence verified through the inline head script from Task 4).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/tui.spec.ts src/scripts/tui.ts
git commit -m "feat(tui): theme switcher with localStorage persistence"
```

---

### Task 9: Contact dialog & Web3Forms (Playwright TDD)

**Files:**
- Create: `src/components/ContactDialog.astro`
- Modify: `tests/e2e/tui.spec.ts`, `src/scripts/tui.ts`, `src/pages/index.astro`

- [ ] **Step 1: Add failing tests to `tests/e2e/tui.spec.ts`**

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:e2e`
Expected: new tests FAIL (no dialog exists).

- [ ] **Step 3: Write `src/components/ContactDialog.astro`**

The Web3Forms access key is a public, domain-bound key — exposed client-side by design. Locally it comes from `.env` (`PUBLIC_WEB3FORMS_KEY=...`); on Cloudflare Pages from an env var.

```astro
---
const accessKey = import.meta.env.PUBLIC_WEB3FORMS_KEY ?? '';
const email = 'paolo@onearrow.io';
---

<dialog id="contact-dialog" aria-label="contact form">
  <h2>// contact</h2>
  <form id="contact-form" method="dialog" data-email={email}>
    <input type="hidden" name="access_key" value={accessKey} />
    <input type="checkbox" name="botcheck" style="display:none" tabindex="-1" autocomplete="off" />
    <input name="name" placeholder="name" required autocomplete="name" />
    <input name="email" type="email" placeholder="email" required autocomplete="email" />
    <textarea name="message" placeholder="message" rows="5" required></textarea>
    <div class="form-actions">
      <span id="contact-status" role="status"></span>
      <span>
        <button type="button" data-close-dialog class="dim">[esc] close</button>
        <button type="submit">[enter] send</button>
      </span>
    </div>
  </form>
</dialog>
```

- [ ] **Step 4: Wire it up**

`src/pages/index.astro` — frontmatter: `import ContactDialog from '../components/ContactDialog.astro';`; body, after `</footer>` (outside `.app`): `<ContactDialog />`

`src/scripts/tui.ts` — append before the keyboard map:

```ts
// ---- contact dialog ----
const contactDialog = document.querySelector<HTMLDialogElement>('#contact-dialog');
const contactForm = document.querySelector<HTMLFormElement>('#contact-form');
const contactStatus = document.querySelector<HTMLElement>('#contact-status');

document
  .querySelector('[data-action="contact"]')
  ?.addEventListener('click', () => contactDialog?.showModal());

document.querySelectorAll('[data-close-dialog]').forEach((btn) =>
  btn.addEventListener('click', () => btn.closest('dialog')?.close())
);

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!contactStatus) return;
  contactStatus.textContent = 'sending…';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    contactStatus.innerHTML = '<span class="sent">✓ message sent</span>';
    contactForm.reset();
  } catch {
    const email = contactForm.dataset.email;
    contactStatus.innerHTML = `<span class="err">✗ failed</span> — retry or <a href="mailto:${email}">email me</a>`;
  }
});
```

Add to the keyboard map `switch`:

```ts
    case 'c':
      contactDialog?.showModal();
      break;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:e2e`
Expected: all pass. (`<dialog>` gives modal focus-trapping and Esc-close natively; the `isTyping`/open-dialog guards keep keybinds out of the form.)

- [ ] **Step 6: Commit**

```bash
git add src/components/ContactDialog.astro src/pages/index.astro src/scripts/tui.ts tests/e2e/tui.spec.ts
git commit -m "feat(contact): modal contact form posting to Web3Forms with mailto fallback"
```

---

### Task 10: Help overlay

**Files:**
- Create: `src/components/HelpDialog.astro`
- Modify: `tests/e2e/tui.spec.ts`, `src/scripts/tui.ts`, `src/pages/index.astro`

- [ ] **Step 1: Add failing tests to `tests/e2e/tui.spec.ts`**

```ts
test('? opens help overlay listing keys; Esc closes', async ({ page }) => {
  await page.keyboard.press('?');
  await expect(page.locator('#help-dialog')).toBeVisible();
  await expect(page.locator('#help-dialog')).toContainText('tab');
  await expect(page.locator('#help-dialog')).toContainText('theme');
  await page.keyboard.press('Escape');
  await expect(page.locator('#help-dialog')).toBeHidden();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e`
Expected: new test FAILS.

- [ ] **Step 3: Write `src/components/HelpDialog.astro`**

```astro
<dialog id="help-dialog" aria-label="keyboard shortcuts">
  <h2>// keys</h2>
  <table class="keys-table">
    <tbody>
      <tr><td><kbd>tab</kbd> / <kbd>shift-tab</kbd></td><td class="dim">cycle pane focus</td></tr>
      <tr><td><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></td><td class="dim">work tabs</td></tr>
      <tr><td><kbd>j</kbd>/<kbd>k</kbd> or arrows</td><td class="dim">move selection / scroll</td></tr>
      <tr><td><kbd>enter</kbd></td><td class="dim">expand/collapse entry</td></tr>
      <tr><td><kbd>c</kbd></td><td class="dim">contact</td></tr>
      <tr><td><kbd>d</kbd></td><td class="dim">download resume (experience tab)</td></tr>
      <tr><td><kbd>t</kbd></td><td class="dim">cycle theme</td></tr>
      <tr><td><kbd>?</kbd></td><td class="dim">this help</td></tr>
      <tr><td><kbd>esc</kbd></td><td class="dim">close</td></tr>
    </tbody>
  </table>
  <p><button type="button" data-close-dialog class="dim">[esc] close</button></p>
</dialog>
```

- [ ] **Step 4: Wire it up**

`src/pages/index.astro` — frontmatter: `import HelpDialog from '../components/HelpDialog.astro';`; body, next to `<ContactDialog />`: `<HelpDialog />`

`src/scripts/tui.ts` — after the contact-dialog section:

```ts
// ---- help dialog ----
const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');

document
  .querySelector('[data-action="help"]')
  ?.addEventListener('click', () => helpDialog?.showModal());
```

Add to the keyboard map `switch`:

```ts
    case '?':
      helpDialog?.showModal();
      break;
```

(The `[data-close-dialog]` listener from Task 9 already covers the close button.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:e2e`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/HelpDialog.astro src/pages/index.astro src/scripts/tui.ts tests/e2e/tui.spec.ts
git commit -m "feat(tui): help overlay with keybinding reference"
```

---

### Task 11: Boot sequence

**Files:**
- Create: `tests/e2e/boot.spec.ts`
- Modify: `src/scripts/tui.ts`

- [ ] **Step 1: Write failing tests** — `tests/e2e/boot.spec.ts` (no `booted` init script here — boot must run)

```ts
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
```

- [ ] **Step 2: Run to verify failures**

Run: `npm run test:e2e -- boot.spec.ts`
Expected: FAIL — overlay never hides (no boot logic yet).

- [ ] **Step 3: Add boot to `src/scripts/tui.ts`** (append at the end, replacing the bare `focusPane(0); syncThemeLabel();` init)

```ts
// ---- boot sequence ----
const BOOT_LINES = [
  'mounting panes………… ok',
  'loading content…… ok',
  'applying theme……… ok',
  'ready.',
];

async function boot(): Promise<void> {
  const overlay = document.querySelector<HTMLElement>('#boot');
  if (!overlay) return;
  // The inline head script already added .no-boot for repeat visits
  // and prefers-reduced-motion; honor it here too.
  if (document.documentElement.classList.contains('no-boot')) {
    overlay.remove();
    return;
  }
  sessionStorage.setItem('booted', '1');

  let skipped = false;
  const skip = () => {
    skipped = true;
    overlay.remove();
  };
  overlay.addEventListener('click', skip, { once: true });
  document.addEventListener('keydown', skip, { once: true });

  const pre = overlay.querySelector('pre')!;
  for (const line of BOOT_LINES) {
    if (skipped) return;
    pre.textContent += line + '\n';
    await new Promise((r) => setTimeout(r, 350));
  }
  if (!skipped) overlay.remove();
}

// ---- init ----
focusPane(0);
syncThemeLabel();
boot();
```

- [ ] **Step 4: Run all tests**

Run: `npm run test:e2e`
Expected: all pass (boot specs and earlier specs — earlier specs pre-seed `booted`, so the overlay self-removes immediately via `.no-boot`).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/boot.spec.ts src/scripts/tui.ts
git commit -m "feat(tui): skippable boot sequence, once per session, reduced-motion aware"
```

---

### Task 12: Mobile verification

The one-column collapse shipped in Task 4's CSS (`@media (max-width: 800px)`). This task verifies it end-to-end.

**Files:**
- Modify: `tests/e2e/tui.spec.ts`

- [ ] **Step 1: Add a failing-or-passing mobile test**

```ts
test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

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
```

Note: `tap()` requires touch support — add `hasTouch` to the describe block's `test.use`: `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });`

- [ ] **Step 2: Run, fix any CSS fallout, pass**

Run: `npm run test:e2e`
Expected: PASS. If stacking fails, check the `@media (max-width: 800px)` block in `global.css` (grid-template-areas must be the single-column list).

- [ ] **Step 3: Eyeball at 390px and 360px**

Run: `npm run dev`, devtools responsive mode.
Expected: one column; status bar sticky at bottom with tap-able contact/theme/help; ASCII art hidden below 360px.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/tui.spec.ts
git commit -m "test(mobile): verify one-column stacking and tappable tabs"
```

---

### Task 13: CI, README & deployment

**Files:**
- Create: `.github/workflows/ci.yml`, `README.md`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      SKIP_KEYSTATIC: 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 2: Write `README.md`**

```markdown
# portfolio-v2

Single-page terminal-style portfolio. Astro 6 + Keystatic + vanilla TS TUI.

## Develop

    npm install
    npm run dev          # site at :4321, content admin at :4321/keystatic

## Edit content

Run dev, open http://localhost:4321/keystatic, edit, commit the changed
files under `content/`, push. Replace `public/resume.pdf` with your real
resume.

## Test

    npm test             # unit (content helpers)
    npm run test:e2e     # playwright smoke tests

## Environment

| Var | Where | Purpose |
|---|---|---|
| `PUBLIC_WEB3FORMS_KEY` | `.env` locally, Cloudflare Pages env | contact form access key (public, domain-bound) — get one at https://web3forms.com |
| `SKIP_KEYSTATIC` | Cloudflare Pages env (`true`) | exclude the Keystatic admin from production builds |

## Deploy (Cloudflare Pages)

1. Push the repo to GitHub; in Cloudflare: Workers & Pages → Create → Pages → connect the repo.
2. Build command: `npm run build` · Output directory: `dist`
3. Environment variables: `SKIP_KEYSTATIC=true`, `PUBLIC_WEB3FORMS_KEY=<your key>`
4. Every push to `main` auto-deploys.

## Keys

`tab` panes · `1-3` tabs · `j/k` move · `enter` expand · `c` contact ·
`d` resume · `t` theme · `?` help
```

- [ ] **Step 3: Full local verification**

Run: `SKIP_KEYSTATIC=true npm run build && npm test && npm run test:e2e`
Expected: build success, all unit + e2e green.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "chore: add CI workflow and README with deployment docs"
```

- [ ] **Step 5: Manual deployment checklist (user actions, not code)**

1. Get a Web3Forms access key (free) at web3forms.com for `paolo@onearrow.io`; put it in `.env` locally and in Cloudflare Pages env.
2. Create the GitHub repo and push (ask which `gh` account to use first, per global preferences).
3. Connect Cloudflare Pages per README; verify the deployed site, the contact form (real submission), and that `/keystatic` 404s in production.
4. Replace `public/resume.pdf` and the seed content via `/keystatic`.

---

## Out of scope (from spec)

- Vite 8 / Rolldown — adopt with the Astro 7 upgrade later.
- Keystatic GitHub mode, CRT scanlines, blog pages.
