# Glass TUI Redesign — Design Spec

**Date:** 2026-06-08
**Status:** Approved
**Builds on:** `docs/specs/2026-06-07-terminal-portfolio-design.md` (v1, shipped)

## Overview

Visual modernization of the shipped terminal portfolio. The pane layout, keyboard model, content pipeline, and all behavior contracts stay; the visual language moves from "literal terminal" to **glass terminal**: ambient gradient backdrop, frosted-glass panes, icons, richer color, cleaner tabs, subtle keycap hints. The page also gains five new components to fill the composition: ASCII hero, /uses, vitals, a `ps aux` gag pane, and a status-bar clock.

All decisions below were validated against rendered mockups with the user.

## Decisions at a glance

| Topic | Decision |
|---|---|
| Style intensity | Glass terminal (mockup option B) |
| Typography | All monospace, **JetBrains Mono** via `@fontsource` (self-hosted, no CDN) |
| Keycap hints | Subtle/flat — hairline border, no bevel |
| Blinking cursors | Removed everywhere; only the native caret in form fields (`caret-color: var(--accent)`) |
| Motion | Subtle micro-motion tier (150-200ms), `prefers-reduced-motion` zeroes all |
| New components | Hero, Uses, Vitals (+heatmap), ps-aux gag, status-bar clock |
| Icons | Inline SVG (lucide-style paths) via a local `Icon.astro` — no icon library dependency |

## Visual system

### Backdrop

The page background becomes a layered scene derived entirely from theme variables (works for all 5 themes with no per-theme art):

- Base: radial gradient from a slightly lifted tone of `--bg` to `--bg-alt`.
- Two large soft ambient blobs: `--violet` and `--accent` at ~10-13% alpha, positioned top-right and bottom-left.
- Implementation via `color-mix(in srgb, var(--x) N%, transparent)` so Green Phosphor gets a green ambience, Gruvbox warm amber, etc.

### Glass surfaces

New derived tokens in `themes.css` (computed from existing vars, defined once in `:root`):

- `--glass`: `color-mix(in srgb, var(--bg) 55%, transparent)` — pane fill
- `--glass-border`: `color-mix(in srgb, var(--fg) 12%, transparent)`
- `--tint-1` / `--tint-2`: violet/accent at low alpha for the backdrop blobs

Panes: `backdrop-filter: blur(14px)` (8px below 800px viewport — cheaper on phones), `--glass` fill, 12px radius, 1px `--glass-border`, soft drop shadow (`0 8px 28px rgb(0 0 0 / 0.35)`).
Focus state: border becomes translucent accent + faint accent glow shadow.
Fallback: `@supports not (backdrop-filter: blur(1px))` → more opaque fill (`color-mix(bg 92%, transparent)`).

### Pane headers

The inset-on-border title is replaced by an in-pane header row: 14px inline SVG icon + uppercase JetBrains Mono label, `letter-spacing: 0.08em`, ~10px size. Violet normally; bright accent when the pane is focused. (Eliminates the title-clipping bug class permanently.) `h2.pane-title` element and `aria-label` stay.

### Bars

Header and status bar: glass strips (blur + translucent fill + hairline border).
Keycaps: `<kbd>` chips — 1px `--fg`-at-15% border, 4px radius, `--fg`-at-6% fill, dim text; brighten on hover of the parent control. No bevel, no shadow.
`NORMAL` mode badge: plain `--violet` text (no gradient).
Status bar right side: `CET HH:MM · NORMAL` — clock updates every minute via `tui.ts` (`Intl.DateTimeFormat` with a `TIMEZONE` constant, `Europe/Madrid`).

### Typography

JetBrains Mono everywhere (400 + 700), self-hosted via `@fontsource/jetbrains-mono`; system mono stack as fallback. Readability: body 15px, line-height 1.65 for running text, prose blocks capped at `max-width: 70ch`. The about intro renders as real `<p>` paragraphs — the template splits `about.intro` on blank lines (`\n\n`); single newlines inside a paragraph are spaces (drop `white-space: pre-line`).

## Components

### Icon.astro (new)

Props: `name` (+ optional `size`, default 14). Renders inline `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">` from a name→path map. Names: `user` (about), `activity` (now), `folder` (work), `cpu` (tech), `terminal` (ps), `monitor` (uses), `pulse` (vitals), `mail` (contact), `palette` (theme), `help` (help), `download` (resume).

### Hero (new pane, full width under header)

- Keystatic singleton `hero.yaml`: `art` (multiline ASCII banner, seeded with figlet-style "juppy.dev"), `tagline` (text).
- Renders centered: `<pre>` with `cyan → violet → red` gradient via `background-clip: text`, then a dim `$ echo "hello@juppy.dev" — {tagline}` line.
- Responsive: banner font-size scales down via `clamp()`; below 480px the `<pre>` hides and a plain gradient-text `juppy.dev` heading shows instead.
- Not keyboard-focusable (no `data-pane`) — it's a banner, not a pane.

### Uses (new pane)

Keystatic singleton `uses.yaml`: ordered `{key, value}` rows (machine, display, editor, terminal, keyboard, …). Rendered like the now pane's dl grid (blue keys). Seeded with plausible demo gear.

### Vitals (new pane)

Keystatic singleton `vitals.yaml`:
- `rows`: `{key, value}` (uptime, shipped, oss stars)
- `heatmap`: array of integers 0-4 (one per week, seeded ~26 values), `heatmapLabel` text ("last 26 weeks")
Rendered: dl grid + a strip of 8×8px squares, accent color at alpha steps `[8%, 25%, 45%, 70%, 95%]` indexed by intensity. Static data for now; a build-time GitHub fetch is explicitly future work.

### ps aux (new pane)

Keystatic singleton `processes.yaml`: list of `{name, state, note}` where state ∈ `running | sleeping | zombie`. Pane title renders `ps aux | grep side-projects`. State colors: running `--green`, sleeping `--yellow`, zombie `--red`; note dim.

### Tabs (work pane restyle)

Underline tabs: full-width hairline rule under the tablist; active tab bright with a 2px `accent → violet` gradient underline (fades/scales in, 180ms); inactive dim, brighten on hover. Labels lose the `1:` prefixes. All `data-tab` / `data-tab-panel` / `aria-*` contracts unchanged.

### Entries (projects/experience restyle)

`▸` marker stays; year as small dim cyan figure; selected entry gets a translucent highlight bar; expanded details get a left hairline rule, 70ch measure, links as `label ↗` in cyan. Highlights `★` cycles palette colors per item.

### Badges (tech restyle)

Pills cycling deterministically through `[blue, red, yellow, green, violet, cyan]` by index within each group: ~13%-alpha tinted fill + matching bright text. Group labels stay blue.

### Dialogs

Glass treatment: blur, translucent fill, translucent accent border, fade+scale-in 180ms. Form fields: translucent fills, accent focus border, `caret-color: var(--accent)`. Help table uses the subtle keycaps.

### Boot overlay

Stays solid `--bg` (pre-paint cover); boot text in `--accent`. Behavior unchanged.

## Layout

Desktop grid (viewport-locked app as today; panes scroll internally):

```
┌──────────────────────────────────────────────┐
│ header bar (glass)                           │
├──────────────────────────────────────────────┤
│ hero (full width)                            │
├──────────────┬───────────────────────────────┤
│ about        │ work (tabs: projects/         │
│ now          │   experience/highlights)      │
│ ps aux       │                               │
├──────┬───────┴──────┬────────────────────────┤
│ tech │ uses         │ vitals                 │
├──────┴──────────────┴────────────────────────┤
│ status bar (glass): keycap hints · clock ·   │
│   NORMAL                                     │
└──────────────────────────────────────────────┘
```

DOM/Tab-focus order: about → now → ps → work → tech → uses → vitals. Mobile (<800px): single column in DOM order with hero on top; sticky glass status bar; blur radius 8px; ambient blobs scaled down.

## Behavior contracts (unchanged)

`tui.ts` keyboard map, pane focus, tab switching, selection, theme switcher, contact submit, boot logic — all untouched except one addition: the clock interval. All `data-*` hooks, element ids, and ARIA attributes stay. The 18 existing e2e tests and 6 unit tests must pass without modification; new e2e tests cover only new surface (hero renders, new panes render + Tab reaches them, clock shows `\d\d:\d\d`).

## Content model changes

New Keystatic singletons: `hero`, `uses`, `vitals`, `processes` (schemas above), each with seeded demo content and reader helpers following the existing `getX(dir?)` pattern (all four are optional-content: empty/missing → pane renders the dim `// nothing here yet` line; they are NOT build-blocking like about/now).

## Motion summary

150-200ms ease: pane focus border/glow, tab underline, hover brightening (links/keys/entries/buttons), dialog fade+scale. Nothing translates position; no ambient animation; no scroll effects. Global `prefers-reduced-motion: reduce` block disables all transitions/animations.

## Out of scope / future

- Build-time GitHub contribution fetch for the vitals heatmap
- Per-theme hero gradients beyond the var-derived defaults
- Sans-serif body option (explicitly rejected — all mono)
- Blinking cursor accents (removed by decision)
