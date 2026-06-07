# Glass TUI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the shipped terminal portfolio to the approved "glass terminal" visual language (JetBrains Mono, frosted panes, icons, keycaps, richer color) and add five new components: ASCII hero, /uses, vitals (+heatmap), ps-aux gag pane, and a status-bar clock.

**Architecture:** Pure restyle + additive components. All v1 behavior contracts (`tui.ts` keyboard map, `data-*` hooks, ARIA, theme switcher, boot) stay; the 18 existing e2e and 6 unit tests must pass UNMODIFIED throughout. New content flows through the existing Keystatic singleton → reader-helper → Astro-component pipeline. All glass colors derive from theme variables via `color-mix()` so all five themes work without per-theme art.

**Tech Stack:** Existing (Astro 6, Keystatic, vanilla TS, Vitest, Playwright) + `@fontsource/jetbrains-mono`.

**Spec:** `docs/specs/2026-06-08-glass-tui-redesign-design.md`

**Branch:** create `feat/glass-redesign` from `main` before Task 1.

---

## File map

| Path | Change |
|---|---|
| `package.json` | + `@fontsource/jetbrains-mono` |
| `src/styles/themes.css` | + derived glass tokens in `:root` |
| `src/styles/global.css` | full replacement (glass system) |
| `src/components/Icon.astro` | NEW — name→inline-SVG map |
| `src/components/Pane.astro` | icon prop in header |
| `src/components/Hero.astro` | NEW |
| `src/components/UsesPane.astro` | NEW |
| `src/components/VitalsPane.astro` | NEW |
| `src/components/PsPane.astro` | NEW |
| `src/components/NowPane.astro` | dl class → `kv` |
| `src/components/WorkPane.astro` | tab labels, year span, links, ★ colors, resume icon |
| `src/components/ContactDialog.astro` | unchanged (CSS-only restyle) |
| `src/components/HelpDialog.astro` | unchanged (CSS-only restyle) |
| `src/pages/index.astro` | font imports, icons, hero + new panes, about paragraphs, badges, clock span |
| `src/lib/palette.ts` | NEW — shared color cycle |
| `src/lib/content.ts` | + getHero/getUses/getVitals/getProcesses |
| `src/scripts/tui.ts` | + clock section only |
| `keystatic.config.ts` | + 4 singletons |
| `content/{hero,uses,vitals,processes}.yaml` | NEW seeds |
| `tests/unit/content.test.ts` | + new-helper tests |
| `tests/e2e/redesign.spec.ts` | NEW |

---

### Task 1: Font & theme tokens

**Files:**
- Modify: `package.json` (via npm install), `src/pages/index.astro` (frontmatter), `src/styles/themes.css`, `src/styles/global.css` (one line)

- [ ] **Step 1: Install the font**

Run: `npm install @fontsource/jetbrains-mono`
Expected: clean install.

- [ ] **Step 2: Import font weights in `src/pages/index.astro`** — add as the FIRST two frontmatter lines (before the style imports):

```astro
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
```

- [ ] **Step 3: Point the font stack at it** — in `src/styles/global.css`, change the `body` font-family line to:

```css
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
```

- [ ] **Step 4: Add derived glass tokens** — append to the END of `src/styles/themes.css`:

```css
/* Derived glass tokens — resolve against whichever theme is active,
   since var() is evaluated at use time. */
:root {
  --glass: color-mix(in srgb, var(--bg) 55%, transparent);
  --glass-border: color-mix(in srgb, var(--fg) 12%, transparent);
  --tint-1: color-mix(in srgb, var(--violet) 12%, transparent);
  --tint-2: color-mix(in srgb, var(--accent) 10%, transparent);
}
```

- [ ] **Step 5: Verify**

Run: `SKIP_KEYSTATIC=true npm run build && npm run test:e2e`
Expected: build green, 18/18 e2e pass. Open dev server and confirm the typeface visibly changed (letterforms with the distinctive JetBrains Mono `g`/`a`).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/pages/index.astro src/styles/themes.css src/styles/global.css
git commit -m "feat(ui): self-host JetBrains Mono and add derived glass tokens"
```

---

### Task 2: Icon component & pane headers

**Files:**
- Create: `src/components/Icon.astro`
- Modify: `src/components/Pane.astro`, `src/pages/index.astro`, `src/components/NowPane.astro`, `src/components/WorkPane.astro`

- [ ] **Step 1: Write `src/components/Icon.astro`**

```astro
---
interface Props {
  name: string;
  size?: number;
}
const { name, size = 14 } = Astro.props;

// Lucide-style stroke paths, 24x24 viewBox.
const PATHS: Record<string, string> = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  terminal: '<path d="M4 17l6-5-6-5"/><path d="M12 19h8"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  pulse: '<path d="M2 12h4l3-8 4 16 3-8h6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  palette: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" opacity="0.35" stroke="none"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
};
---

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  set:html={PATHS[name] ?? ''}
/>
```

- [ ] **Step 2: Add the icon prop to `src/components/Pane.astro`** — full new content:

```astro
---
import Icon from './Icon.astro';

interface Props {
  title: string;
  id: string;
  icon?: string;
}
const { title, id, icon } = Astro.props;
---

<section class="pane" id={`pane-${id}`} data-pane={id} tabindex="-1" aria-label={title}>
  <h2 class="pane-title">{icon && <Icon name={icon} />}{title}</h2>
  <div class="pane-body">
    <slot />
  </div>
</section>
```

- [ ] **Step 3: Wire icons at call sites**

`src/pages/index.astro`: `<Pane title="about" id="about" icon="user">` and `<Pane title="tech" id="tech" icon="cpu">`.
`src/components/NowPane.astro`: `<Pane title="now" id="now" icon="activity">`.
`src/components/WorkPane.astro`: `<Pane title="work" id="work" icon="folder">`.

Status bar buttons in `src/pages/index.astro` (add `import Icon from '../components/Icon.astro';` to frontmatter) — replace the three buttons with:

```astro
<button data-action="contact"><Icon name="mail" /> contact <kbd>c</kbd></button>
<button data-action="theme"><Icon name="palette" /> <span data-theme-label>andromeda</span> <kbd>t</kbd></button>
<button data-action="help"><Icon name="help" /> help <kbd>?</kbd></button>
```

Resume link in `src/components/WorkPane.astro` (add `import Icon from './Icon.astro';`):

```astro
<p><a id="resume-link" href="/resume.pdf" download><Icon name="download" /> resume.pdf</a> <span class="dim desktop-hints">(or press d)</span></p>
```

- [ ] **Step 4: Verify**

Run: `npm run test:e2e`
Expected: 18/18 pass (titles still render, contracts unchanged; the header layout looks off until Task 3's CSS — that's expected).

- [ ] **Step 5: Commit**

```bash
git add src/components/Icon.astro src/components/Pane.astro src/components/NowPane.astro src/components/WorkPane.astro src/pages/index.astro
git commit -m "feat(ui): add inline SVG icon component and wire pane/status-bar icons"
```

---

### Task 3: Glass stylesheet

**Files:**
- Modify: `src/styles/global.css` (FULL replacement)

- [ ] **Step 1: Replace `src/styles/global.css` entirely with:**

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
  background:
    radial-gradient(circle at 72% 12%, var(--tint-1), transparent 42%),
    radial-gradient(circle at 22% 85%, var(--tint-2), transparent 46%),
    radial-gradient(ellipse at 25% 0%, color-mix(in srgb, var(--fg) 7%, var(--bg)) 0%, var(--bg-alt) 62%);
  background-attachment: fixed;
  color: var(--fg);
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
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
  display: inline-block;
  min-width: 1.2em;
  padding: 0 5px;
  text-align: center;
  font-family: inherit;
  font-size: 0.8em;
  color: var(--dim);
  background: color-mix(in srgb, var(--fg) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--fg) 15%, transparent);
  border-radius: 4px;
  transition: color 150ms ease, border-color 150ms ease;
}

.dim {
  color: var(--dim);
}

.prose {
  max-width: 70ch;
  line-height: 1.65;
  margin: 0 0 0.8em;
}

:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

/* ---- app frame ---- */
.app {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  height: 100dvh;
  padding: 10px;
}

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: color-mix(in srgb, var(--bg-alt) 60%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
  color: var(--dim);
  border-radius: 8px;
  padding: 5px 12px;
}

.bar .ok {
  color: var(--green);
}

.bar .mode {
  color: var(--violet);
}

.bar button {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  transition: color 150ms ease;
}

.bar button:hover,
.bar button:hover kbd {
  color: var(--fg);
}

.hints {
  display: flex;
  gap: 0.9rem;
  flex-wrap: wrap;
  align-items: center;
}

.clock {
  color: var(--cyan);
}

.clock:not(:empty)::after {
  content: ' · ';
  color: var(--dim);
}

/* ---- pane grid ---- */
.grid {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 1fr 1fr;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  grid-template-areas:
    'hero  hero hero'
    'about work work'
    'now   work work'
    'ps    work work'
    'tech  uses vitals';
  gap: 10px;
  min-height: 0;
}

.hero        { grid-area: hero; }
#pane-about  { grid-area: about; }
#pane-now    { grid-area: now; }
#pane-ps     { grid-area: ps; }
#pane-work   { grid-area: work; }
#pane-tech   { grid-area: tech; }
#pane-uses   { grid-area: uses; }
#pane-vitals { grid-area: vitals; }

/* ---- glass panes ---- */
.pane {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 0.85rem 0.9rem;
  min-height: 0;
  background: var(--glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.35);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.pane-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.pane:focus {
  outline: none;
}

.pane.focused {
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  box-shadow: 0 8px 28px color-mix(in srgb, var(--accent) 12%, transparent);
}

.pane-title {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin: 0 0 0.55rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--violet);
  transition: color 160ms ease;
}

.pane.focused .pane-title {
  color: var(--accent);
}

/* ---- hero ---- */
.hero {
  position: relative;
  text-align: center;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 1rem 0.9rem 0.75rem;
  background: var(--glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.35);
}

.hero-art,
.hero-art-fallback {
  font-weight: 700;
  background: linear-gradient(90deg, var(--cyan), var(--violet), var(--red));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-art {
  display: inline-block;
  text-align: left;
  margin: 0;
  font-size: clamp(5px, 1.1vw, 11px);
  line-height: 1.15;
}

.hero-art-fallback {
  display: none;
  font-size: 1.6rem;
}

.hero-tagline {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--dim);
}

.hero-tagline .accent {
  color: var(--cyan);
}

/* ---- tabs ---- */
.tabs {
  display: flex;
  gap: 1.1rem;
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: 0.6rem;
}

.tabs [role='tab'] {
  position: relative;
  color: var(--dim);
  padding: 0 2px 6px;
  transition: color 160ms ease;
}

.tabs [role='tab']:hover,
.tabs [role='tab'][aria-selected='true'] {
  color: var(--fg);
}

.tabs [role='tab']::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), var(--violet));
  opacity: 0;
  transform: scaleX(0.6);
  transition: opacity 180ms ease, transform 180ms ease;
}

.tabs [role='tab'][aria-selected='true']::after {
  opacity: 1;
  transform: scaleX(1);
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
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 150ms ease;
}

.entries .entry-line:hover {
  background: color-mix(in srgb, var(--fg) 5%, transparent);
}

.entries [data-entry].selected > .entry-line {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.entries .marker {
  color: var(--yellow);
}

.entries .year {
  color: var(--cyan);
  opacity: 0.75;
  font-size: 0.8rem;
}

.entries [data-entry-details] {
  border-left: 1px solid var(--glass-border);
  margin: 0.2rem 0 0.4rem 6px;
  padding: 0.2rem 0 0.3rem 1rem;
  max-width: 70ch;
  color: var(--dim);
  white-space: pre-line;
}

.entries [data-entry-details] a,
.links a {
  color: var(--cyan);
  text-decoration: none;
  margin-right: 0.75rem;
  transition: color 150ms ease;
}

.entries [data-entry-details] a::after,
.links a::after {
  content: ' ↗';
  font-size: 0.85em;
}

.entries [data-entry-details] a:hover,
.links a:hover {
  color: var(--fg);
}

/* ---- key/value grids (now, uses, vitals) ---- */
.now {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.now-art {
  margin: 0;
  line-height: 1.2;
}

.kv {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0 1rem;
}

.kv dt {
  color: var(--blue);
}

.kv dd {
  margin: 0;
}

/* ---- tech pane ---- */
.tech-group {
  margin-bottom: 0.45rem;
}

.tech-group .label {
  color: var(--blue);
  margin-right: 0.5rem;
  font-size: 0.85rem;
}

.badge {
  display: inline-block;
  border-radius: 999px;
  padding: 1px 9px;
  margin: 2px 3px 2px 0;
  font-size: 0.8rem;
}

.badge-blue   { background: color-mix(in srgb, var(--blue) 13%, transparent);   color: var(--blue); }
.badge-red    { background: color-mix(in srgb, var(--red) 13%, transparent);    color: var(--red); }
.badge-yellow { background: color-mix(in srgb, var(--yellow) 13%, transparent); color: var(--yellow); }
.badge-green  { background: color-mix(in srgb, var(--green) 13%, transparent);  color: var(--green); }
.badge-violet { background: color-mix(in srgb, var(--violet) 13%, transparent); color: var(--violet); }
.badge-cyan   { background: color-mix(in srgb, var(--cyan) 13%, transparent);   color: var(--cyan); }

/* ---- ps pane ---- */
.ps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
}

.ps-state {
  display: inline-block;
  min-width: 5.5em;
}

.ps-running  { color: var(--green); }
.ps-sleeping { color: var(--yellow); }
.ps-zombie   { color: var(--red); }

/* ---- vitals heatmap ---- */
.heatmap {
  margin-top: 0.5rem;
}

.heatmap-label {
  display: block;
  font-size: 0.75rem;
  margin-bottom: 0.2rem;
}

.hm-cell {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin: 0 2px 0 0;
}

/* ---- dialogs ---- */
dialog {
  background: var(--glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: var(--fg);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  border-radius: 12px;
  padding: 1.25rem;
  min-width: min(480px, 90vw);
  box-shadow: 0 16px 48px rgb(0 0 0 / 0.5);
}

dialog[open] {
  animation: dialog-in 180ms ease;
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
}

dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(4px);
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
  background: color-mix(in srgb, var(--bg-alt) 70%, transparent);
  color: var(--fg);
  caret-color: var(--accent);
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  transition: border-color 150ms ease;
}

dialog input:focus,
dialog textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 60%, transparent);
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
  padding: 2px 0.75rem 2px 0;
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
  color: var(--accent);
  margin: 0;
}

.no-boot #boot {
  display: none;
}

/* ---- fallback: no backdrop-filter ---- */
@supports not (backdrop-filter: blur(1px)) {
  .pane,
  .hero,
  .bar,
  dialog {
    background: color-mix(in srgb, var(--bg) 92%, transparent);
  }
}

/* ---- mobile ---- */
@media (max-width: 800px) {
  .app {
    height: auto;
    min-height: 100dvh;
  }

  .grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-template-areas: 'hero' 'about' 'now' 'ps' 'work' 'tech' 'uses' 'vitals';
  }

  .status-bar {
    position: sticky;
    bottom: 10px;
  }

  /* cheaper blur on phone GPUs */
  .pane,
  .hero,
  .bar,
  dialog {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  body {
    background:
      radial-gradient(circle at 80% 5%, var(--tint-1), transparent 30%),
      radial-gradient(circle at 15% 95%, var(--tint-2), transparent 32%),
      radial-gradient(ellipse at 25% 0%, color-mix(in srgb, var(--fg) 7%, var(--bg)) 0%, var(--bg-alt) 62%);
    background-attachment: fixed;
  }

  /* art stacks above the rows on narrow screens */
  .now {
    flex-direction: column;
  }

  .desktop-hints {
    display: none;
  }
}

@media (max-width: 480px) {
  .hero-art {
    display: none;
  }

  .hero-art-fallback {
    display: inline-block;
  }
}

@media (max-width: 360px) {
  .now-art {
    display: none;
  }
}

/* ---- reduced motion: kill everything ---- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
  }
}
```

Notes on what this intentionally removes vs v1: the blink keyframes and both blinking-cursor rules (`.pane-title::after`, `.intro-cursor`) are GONE by design; `.pane-title` is no longer absolutely positioned; `.now-rows` is replaced by `.kv` (markup updated in Tasks 4/7).

- [ ] **Step 2: Update `src/components/NowPane.astro`** — change `<dl class="now-rows">` to `<dl class="kv">`. Nothing else. (The new stylesheet only ships `.kv`; doing this in the same task avoids an unstyled intermediate state.)

- [ ] **Step 3: Verify**

Run: `SKIP_KEYSTATIC=true npm run build && npm run test:e2e`
Expected: build green, 18/18 pass. Eyeball dev server: glass panes over ambient backdrop, icon pane titles, keycaps in bars, styled now-pane grid, no blinking cursors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css src/components/NowPane.astro
git commit -m "feat(ui): glass terminal stylesheet — backdrop, frosted panes, keycaps, motion"
```

---

### Task 4: Markup modernization (tabs, entries, badges, prose)

**Files:**
- Create: `src/lib/palette.ts`
- Modify: `src/components/WorkPane.astro`, `src/pages/index.astro`

- [ ] **Step 1: Write `src/lib/palette.ts`**

```ts
/** Deterministic color cycle for badges and highlight stars. */
export const PALETTE_CYCLE = ['blue', 'red', 'yellow', 'green', 'violet', 'cyan'] as const;

export function cycleColor(i: number): string {
  return PALETTE_CYCLE[i % PALETTE_CYCLE.length];
}
```

- [ ] **Step 2: Update `src/components/WorkPane.astro`**

a) Tab labels lose the number prefix — the tablist becomes:

```astro
  <div class="tabs" role="tablist" aria-label="work sections">
    {tabs.map((tab, i) => (
      <button role="tab" id={`tab-${tab}`} data-tab={tab} aria-selected={i === 0 ? 'true' : 'false'} aria-controls={`panel-${tab}`}>
        {tab}
      </button>
    ))}
  </div>
```

b) Project entry line — year moves to a styled span (replace the existing name/blurb/year line):

```astro
          <button class="entry-line" aria-expanded="false">
            <span class="marker">▸</span> {p.name}
            {p.blurb && <span class="dim"> — {p.blurb}</span>}
            {p.year && <span class="year"> {p.year}</span>}
          </button>
```

c) Project links lose the brackets (CSS adds ↗) — inside `[data-entry-details]`:

```astro
            {p.links.length > 0 && (
              <p>
                {p.links.map((l) => (
                  <a href={l.url}>{l.label}</a>
                ))}
              </p>
            )}
```

d) Highlights get cycling star colors — add `import { cycleColor } from '../lib/palette';` to frontmatter and replace the highlights list items:

```astro
      {highlights.map((h, i) => (
        <li>
          <span style={`color: var(--${cycleColor(i)})`}>★</span> {h.text}
          {h.year && <span class="year"> {h.year}</span>}
        </li>
      ))}
```

- [ ] **Step 3: Update `src/pages/index.astro`**

a) Frontmatter gains `import { cycleColor } from '../lib/palette';`

b) About pane — paragraphs split on blank lines, single newlines become spaces, cursor span removed, links get the `.links` class:

```astro
        <Pane title="about" id="about" icon="user">
          {about.intro.split(/\n{2,}/).map((para) => (
            <p class="prose">{para.replace(/\n/g, ' ')}</p>
          ))}
          <p class="links">
            {about.links.map((l) => (
              <a href={l.url}>{l.label}</a>
            ))}
          </p>
        </Pane>
```

c) Tech badges cycle colors:

```astro
        <Pane title="tech" id="tech" icon="cpu">
          {tech.length === 0 && <p class="dim">// nothing here yet</p>}
          {tech.map((group) => (
            <div class="tech-group">
              <span class="label">{group.name}</span>
              {group.items.map((item, i) => (
                <span class={`badge badge-${cycleColor(i)}`}>{item}</span>
              ))}
            </div>
          ))}
        </Pane>
```

- [ ] **Step 4: Verify**

Run: `SKIP_KEYSTATIC=true npm run build && npm run test:e2e`
Expected: build green, 18/18 pass (tab tests use `data-tab`, not labels). Eyeball: clean tabs with gradient underline, colored badge pills, about renders as two real paragraphs with no mid-sentence breaks, links show `label ↗`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/palette.ts src/components/WorkPane.astro src/pages/index.astro
git commit -m "feat(ui): modern tabs, colored badges, prose paragraphs, link affordances"
```

---

### Task 5: Content model for new components (TDD)

**Files:**
- Modify: `keystatic.config.ts`, `src/lib/content.ts`, `tests/unit/content.test.ts`
- Create: `content/hero.yaml`, `content/uses.yaml`, `content/vitals.yaml`, `content/processes.yaml`

- [ ] **Step 1: Add failing tests** — append inside the `describe('content helpers', ...)` block of `tests/unit/content.test.ts`, and extend the imports:

```ts
import {
  getAbout,
  getExperience,
  getHero,
  getHighlights,
  getNow,
  getProcesses,
  getProjects,
  getTech,
  getUses,
  getVitals,
} from '../../src/lib/content';
```

```ts
  it('reads hero art and tagline', async () => {
    const hero = await getHero();
    expect(hero?.art).toContain('█');
    expect(hero?.tagline).toBeTruthy();
  });

  it('reads uses rows', async () => {
    const rows = await getUses();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].key).toBeTruthy();
  });

  it('reads vitals rows and a 0-4 heatmap', async () => {
    const vitals = await getVitals();
    expect(vitals?.rows.length).toBeGreaterThan(0);
    expect(vitals?.heatmap.length).toBeGreaterThan(0);
    expect(vitals?.heatmap.every((v) => v >= 0 && v <= 4)).toBe(true);
  });

  it('reads processes with valid states', async () => {
    const procs = await getProcesses();
    expect(procs.length).toBeGreaterThan(0);
    expect(procs.every((p) => ['running', 'sleeping', 'zombie'].includes(p.state))).toBe(true);
  });

  it('tolerates missing new singletons', async () => {
    expect(await getHero(EMPTY)).toBeNull();
    expect(await getUses(EMPTY)).toEqual([]);
    expect(await getVitals(EMPTY)).toBeNull();
    expect(await getProcesses(EMPTY)).toEqual([]);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — `getHero` etc. not exported.

- [ ] **Step 3: Add singletons to `keystatic.config.ts`**

a) Extract the repeated key/value rows array — add near the `links` const:

```ts
const kvRows = fields.array(
  fields.object({
    key: fields.text({ label: 'Key' }),
    value: fields.text({ label: 'Value' }),
  }),
  {
    label: 'Rows',
    itemLabel: (props) => `${props.fields.key.value}: ${props.fields.value.value}`,
  }
);
```

b) In the `now` singleton, replace the inline `rows: fields.array(...)` definition with `rows: kvRows,`.

c) Add four singletons after `tech`:

```ts
    hero: singleton({
      label: 'Hero',
      path: 'content/hero',
      format: { data: 'yaml' },
      schema: {
        art: fields.text({ label: 'ASCII banner', multiline: true }),
        tagline: fields.text({ label: 'Tagline' }),
      },
    }),
    uses: singleton({
      label: 'Uses',
      path: 'content/uses',
      format: { data: 'yaml' },
      schema: {
        rows: kvRows,
      },
    }),
    vitals: singleton({
      label: 'Vitals',
      path: 'content/vitals',
      format: { data: 'yaml' },
      schema: {
        rows: kvRows,
        heatmapLabel: fields.text({ label: 'Heatmap label' }),
        heatmap: fields.array(
          fields.integer({ label: 'Intensity (0-4)', defaultValue: 0 }),
          { label: 'Heatmap weeks', itemLabel: (props) => String(props.value) }
        ),
      },
    }),
    processes: singleton({
      label: 'Processes (ps aux)',
      path: 'content/processes',
      format: { data: 'yaml' },
      schema: {
        items: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            state: fields.select({
              label: 'State',
              options: [
                { label: 'running', value: 'running' },
                { label: 'sleeping', value: 'sleeping' },
                { label: 'zombie', value: 'zombie' },
              ],
              defaultValue: 'running',
            }),
            note: fields.text({ label: 'Note' }),
          }),
          { label: 'Processes', itemLabel: (props) => props.fields.name.value }
        ),
      },
    }),
```

- [ ] **Step 4: Add helpers to `src/lib/content.ts`** — append:

```ts
export async function getHero(dir?: string) {
  return await reader(dir).singletons.hero.read();
}

export async function getUses(dir?: string) {
  return (await reader(dir).singletons.uses.read())?.rows ?? [];
}

export async function getVitals(dir?: string) {
  return await reader(dir).singletons.vitals.read();
}

export async function getProcesses(dir?: string) {
  return (await reader(dir).singletons.processes.read())?.items ?? [];
}
```

- [ ] **Step 5: Write seed content**

`content/hero.yaml` (note the `|2-` indicator — lines have mixed leading indents):

```yaml
art: |2-
     ██╗██╗   ██╗██████╗ ██████╗ ██╗   ██╗   ██████╗ ███████╗██╗   ██╗
     ██║██║   ██║██╔══██╗██╔══██╗╚██╗ ██╔╝   ██╔══██╗██╔════╝██║   ██║
     ██║██║   ██║██████╔╝██████╔╝ ╚████╔╝    ██║  ██║█████╗  ██║   ██║
  ██ ██║██║   ██║██╔═══╝ ██╔═══╝   ╚██╔╝     ██║  ██║██╔══╝  ╚██╗ ██╔╝
  ╚████╔╝╚█████╔╝██║     ██║        ██║   ██╗██████╔╝███████╗ ╚████╔╝
   ╚═══╝  ╚════╝ ╚═╝     ╚═╝        ╚═╝   ╚═╝╚═════╝ ╚══════╝  ╚═══╝
tagline: product-minded engineer · developer tools · realtime systems
```

`content/uses.yaml`:

```yaml
rows:
  - key: machine
    value: MacBook Pro M3 Max
  - key: display
    value: Studio Display 27"
  - key: editor
    value: neovim (btw)
  - key: terminal
    value: ghostty + tmux
  - key: keyboard
    value: ZSA Voyager
  - key: theme
    value: tokyo nebula andromeda
```

`content/vitals.yaml`:

```yaml
rows:
  - key: uptime
    value: 12y in production
  - key: shipped
    value: 23 projects
  - key: oss stars
    value: 2.4k ★
heatmapLabel: last 26 weeks
heatmap:
  - 1
  - 2
  - 4
  - 3
  - 1
  - 4
  - 2
  - 0
  - 3
  - 2
  - 4
  - 1
  - 3
  - 4
  - 2
  - 3
  - 0
  - 2
  - 4
  - 3
  - 1
  - 2
  - 3
  - 4
  - 2
  - 3
```

`content/processes.yaml`:

```yaml
items:
  - name: codegraph
    state: running
    note: cpu 87%
  - name: portfolio-v2
    state: running
    note: cpu 64%
  - name: hookline
    state: sleeping
    note: cpu 2%
  - name: that-game-engine
    state: zombie
    note: since 2019
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: 11 passed (6 existing + 5 new).

- [ ] **Step 7: Verify Keystatic admin shows the new singletons**

Run `npm run dev`, open `http://localhost:4321/keystatic` — Hero, Uses, Vitals, Processes appear and open without errors. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add keystatic.config.ts src/lib/content.ts tests/unit/content.test.ts content/hero.yaml content/uses.yaml content/vitals.yaml content/processes.yaml
git commit -m "feat(content): hero, uses, vitals, and processes singletons with helpers"
```

---

### Task 6: Hero component (Playwright TDD)

**Files:**
- Create: `src/components/Hero.astro`, `tests/e2e/redesign.spec.ts`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Write the failing test** — `tests/e2e/redesign.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('booted', '1'));
  await page.goto('/');
});

test('hero renders banner and tagline', async ({ page }) => {
  await expect(page.locator('.hero-art')).toBeVisible();
  await expect(page.locator('.hero-tagline')).toContainText('hello@juppy.dev');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx playwright test redesign.spec.ts`
Expected: FAIL — no `.hero-art`.

- [ ] **Step 3: Write `src/components/Hero.astro`**

```astro
---
import { getHero } from '../lib/content';

const hero = await getHero();
---

{
  hero && (
    <section class="hero" aria-label="juppy.dev">
      <pre class="hero-art" aria-hidden="true">{hero.art}</pre>
      <span class="hero-art-fallback">juppy.dev</span>
      <p class="hero-tagline">
        $ echo "hello@juppy.dev" <span class="accent">— {hero.tagline}</span>
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Mount it** — `src/pages/index.astro` frontmatter gains `import Hero from '../components/Hero.astro';`; `<Hero />` becomes the FIRST child of `<main class="grid">` (before the about pane).

- [ ] **Step 5: Run tests**

Run: `npx playwright test redesign.spec.ts && npm run test:e2e`
Expected: hero test passes; full suite 19/19. Eyeball: gradient banner centered, scales with viewport; at <480px the plain `juppy.dev` text replaces it.

- [ ] **Step 6: Commit**

```bash
git add src/components/Hero.astro src/pages/index.astro tests/e2e/redesign.spec.ts
git commit -m "feat(ui): ASCII hero banner with gradient and mobile fallback"
```

---

### Task 7: Uses, Vitals, and ps panes (Playwright TDD)

**Files:**
- Create: `src/components/UsesPane.astro`, `src/components/VitalsPane.astro`, `src/components/PsPane.astro`
- Modify: `src/pages/index.astro`, `tests/e2e/redesign.spec.ts`

- [ ] **Step 1: Add failing tests** to `tests/e2e/redesign.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx playwright test redesign.spec.ts`
Expected: the two new tests FAIL.

- [ ] **Step 3: Write `src/components/UsesPane.astro`**

```astro
---
import Pane from './Pane.astro';
import { getUses } from '../lib/content';

const rows = await getUses();
---

<Pane title="uses" id="uses" icon="monitor">
  {rows.length === 0 && <p class="dim">// nothing here yet</p>}
  <dl class="kv">
    {rows.map((row) => (
      <>
        <dt>{row.key}</dt>
        <dd>{row.value}</dd>
      </>
    ))}
  </dl>
</Pane>
```

- [ ] **Step 4: Write `src/components/VitalsPane.astro`**

```astro
---
import Pane from './Pane.astro';
import { getVitals } from '../lib/content';

const vitals = await getVitals();
// Alpha steps for heatmap intensities 0-4.
const ALPHAS = [8, 25, 45, 70, 95];
---

<Pane title="vitals" id="vitals" icon="pulse">
  {!vitals && <p class="dim">// nothing here yet</p>}
  {
    vitals && (
      <>
        <dl class="kv">
          {vitals.rows.map((row) => (
            <>
              <dt>{row.key}</dt>
              <dd>{row.value}</dd>
            </>
          ))}
        </dl>
        {vitals.heatmap.length > 0 && (
          <div class="heatmap">
            <span class="dim heatmap-label">{vitals.heatmapLabel}</span>
            <div>
              {vitals.heatmap.map((v) => (
                <span
                  class="hm-cell"
                  style={`background: color-mix(in srgb, var(--accent) ${ALPHAS[Math.min(Math.max(v, 0), 4)]}%, transparent)`}
                />
              ))}
            </div>
          </div>
        )}
      </>
    )
  }
</Pane>
```

- [ ] **Step 5: Write `src/components/PsPane.astro`**

```astro
---
import Pane from './Pane.astro';
import { getProcesses } from '../lib/content';

const procs = await getProcesses();
---

<Pane title="ps aux | grep side-projects" id="ps" icon="terminal">
  {procs.length === 0 && <p class="dim">// nothing here yet</p>}
  <ul class="ps-list">
    {procs.map((p) => (
      <li>
        <span class={`ps-state ps-${p.state}`}>{p.state}</span>
        <span>{p.name}</span>
        <span class="dim"> {p.note}</span>
      </li>
    ))}
  </ul>
</Pane>
```

- [ ] **Step 6: Mount all three** — `src/pages/index.astro` frontmatter gains:

```astro
import UsesPane from '../components/UsesPane.astro';
import VitalsPane from '../components/VitalsPane.astro';
import PsPane from '../components/PsPane.astro';
```

Inside `<main class="grid">`, the final child order must be (DOM order = Tab order = mobile order):

```astro
<Hero />
<Pane title="about" ...>…</Pane>
<NowPane />
<PsPane />
<WorkPane />
<Pane title="tech" ...>…</Pane>
<UsesPane />
<VitalsPane />
```

(The grid CSS from Task 3 already has areas for all of these.)

- [ ] **Step 7: Run tests**

Run: `npm run test:e2e`
Expected: full suite 21/21 — the 18 v1 tests (unmodified) plus 3 redesign tests (1 from Task 6, 2 from this task). The v1 test "first pane is focused on load; Tab cycles panes" still passes — about is still the first `[data-pane]` and now is second.

- [ ] **Step 8: Commit**

```bash
git add src/components/UsesPane.astro src/components/VitalsPane.astro src/components/PsPane.astro src/pages/index.astro tests/e2e/redesign.spec.ts
git commit -m "feat(ui): uses, vitals (heatmap), and ps-aux panes"
```

---

### Task 8: Status-bar clock (Playwright TDD) & final verification

**Files:**
- Modify: `tests/e2e/redesign.spec.ts`, `src/pages/index.astro`, `src/scripts/tui.ts`

- [ ] **Step 1: Add failing test** to `tests/e2e/redesign.spec.ts`:

```ts
test('status bar clock shows the time', async ({ page }) => {
  await expect(page.locator('[data-clock]')).toHaveText(/CET \d{2}:\d{2}/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx playwright test redesign.spec.ts`
Expected: clock test FAILS (no element).

- [ ] **Step 3: Add the clock span** — in `src/pages/index.astro`, replace `<span class="mode">NORMAL</span>` with:

```astro
<span><span class="clock" data-clock></span><span class="mode">NORMAL</span></span>
```

(The `.clock:not(:empty)::after` rule from Task 3 renders the ` · ` separator once JS fills it.)

- [ ] **Step 4: Add the clock to `src/scripts/tui.ts`** — insert before the `// ---- boot sequence ----` section:

```ts
// ---- clock ----
const TIMEZONE = 'Europe/Madrid';
const clockEl = document.querySelector<HTMLElement>('[data-clock]');

function tickClock(): void {
  if (!clockEl) return;
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
  }).format(new Date());
  clockEl.textContent = `CET ${time}`;
}

setInterval(tickClock, 60_000);
```

And in the `// ---- init ----` block, add `tickClock();` after `syncThemeLabel();`.

- [ ] **Step 5: Full verification**

Run: `SKIP_KEYSTATIC=true npm run build && npm test && npm run test:e2e`
Expected: build green, 11 unit, 22 e2e (18 v1 unmodified + 4 redesign), all passing.

- [ ] **Step 6: Visual smoke check**

Take a desktop screenshot (1400×900) and a mobile one (390×844) via a throwaway Playwright spec or the dev server; confirm: hero gradient banner, glass panes with icon titles, underline tabs, colored badges, heatmap, ps states colored, keycaps + clock in status bar, no blinking cursors anywhere, all five themes cycle sanely with `t`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro src/scripts/tui.ts tests/e2e/redesign.spec.ts
git commit -m "feat(tui): status-bar clock"
```

---

## Self-review notes (spec → tasks)

- Backdrop/glass/tokens → T1/T3 · headers+icons → T2 · keycaps/bars → T3 · typography+paragraphs → T1/T4 · tabs/entries/badges → T4 · content model → T5 · hero → T6 · uses/vitals/ps + layout → T7 · clock → T8 · cursors removed → T3 · reduced-motion, @supports, mobile blur → T3 · contracts untouched: every task ends with the v1 e2e suite green.

## Out of scope (per spec)

GitHub-fetched heatmap data; per-theme hero gradients; sans body text.
