# Terminal-Style Portfolio — Design Spec

**Date:** 2026-06-07
**Status:** Approved

## Overview

A single-page portfolio site styled as a multi-pane terminal UI (charmbracelet/ratatui aesthetic). Keyboard-first TUI interaction with full mouse/touch fallback. Content managed via Keystatic, deployed as a fully static site on Cloudflare Pages.

Sections: about, "now" (Macchina-style key/value pane with ASCII art), projects, work experience, career highlights, tech, contact form, downloadable PDF resume.

## Stack

- **Astro 6** (static output, Vite 7). Do not force rolldown-vite; upgrade to Vite 8/Rolldown when Astro 7 ships.
- **Keystatic** for content editing — admin UI at `/keystatic`, available only in local dev. Content lives as YAML in the repo; production is static with no admin, server, or database.
- **Vanilla TypeScript** (~200 lines) for the TUI layer. No client framework shipped.
- **Web3Forms** for contact form submission (public client-side access key, domain-bound; swappable for Formspree).
- **Cloudflare Pages** for hosting, auto-deploy from GitHub.

## Project structure

```
portfolio-v2/
├── astro.config.mjs          # static output; keystatic integration (dev only)
├── keystatic.config.ts       # content schema
├── content/
│   ├── about.yaml            # singleton: intro text, name, links
│   ├── now.yaml              # singleton: macchina-style rows + ASCII art
│   ├── highlights.yaml       # singleton: list of career highlights
│   ├── tech.yaml             # singleton: grouped tech/tools
│   ├── projects/*.yaml       # collection: name, blurb, details, links, year
│   └── experience/*.yaml     # collection: role, company, period, bullets
├── public/resume.pdf
└── src/
    ├── pages/index.astro     # the single page; reads content at build time
    ├── components/           # Pane.astro, Tabs.astro, NowPane.astro, ...
    ├── scripts/tui.ts        # keyboard nav, focus, tabs, boot, theme, form
    └── styles/themes.css     # CSS custom properties per theme
```

**Data flow:** Keystatic admin edits YAML in `content/` → commit → push → Cloudflare Pages builds (`astro build`, output `dist/`) reading content via Keystatic's reader API → static HTML.

## Content model (Keystatic)

Singletons:

- **about** — name, intro text (multiline), social/contact links
- **now** — ordered list of `{key, value}` rows (e.g. `Building → this site`, `Status → open to work`), plus:
  - `art`: multiline text field holding an ASCII art block (Macchina-style, rendered beside the rows)
  - `artColor`: optional pick from the theme palette slots
- **highlights** — ordered list of highlight entries (text + optional year)
- **tech** — groups (e.g. languages, frameworks, tools), each a list of badge labels

Collections:

- **projects** — name, one-line blurb, expanded details (multiline), links, year
- **experience** — role, company, period, bullet list

## Layout (desktop, CSS Grid)

```
┌──────────────────────────────────────────────────┐
│ header bar: ● juppy@portfolio          ~/v2      │
├───────────────┬──────────────────────────────────┤
│ about         │ work [projects|experience|       │
│               │       highlights]    (tabbed)    │
├───────────────┤                                  │
│ now           │                                  │
│  (art + k/v   ├──────────────────────────────────┤
│   rows)       │ tech — grouped badge rows        │
├───────────────┴──────────────────────────────────┤
│ status bar: tab pane · 1-3 tabs · c contact ·    │
│             t theme · ? help          [NORMAL]   │
└──────────────────────────────────────────────────┘
```

- Panes have rounded TUI-style borders with the title inset in the top border.
- The focused pane gets the accent border color.
- The work pane is tabbed: projects / experience / highlights. Entries form a list; a selection cursor moves with j/k; Enter expands an entry's details inline.
- Resume download is a `[↓ resume.pdf]` action inside the experience tab (clickable; `d` when that tab is focused). The PDF is a static file in `public/`.
- Contact form opens as a centered modal pane (lazygit-popup style).
- Status bar always shows key hints (discoverability for mouse-only visitors) and doubles as clickable navigation (e.g. clicking the theme name cycles themes).

## Keyboard map

| Key | Action |
|---|---|
| `Tab` / `Shift-Tab` | cycle pane focus |
| `1` `2` `3` | switch work-pane tabs |
| `j`/`k` or arrows | move selection / scroll in focused pane |
| `Enter` | expand/collapse selected entry |
| `c` | open contact modal |
| `d` | download resume (when experience tab focused) |
| `t` | cycle theme |
| `?` | help overlay listing all keys |
| `Esc` | close modal/overlay |

All actions also work via mouse/touch: click to focus panes, click tabs, click entries to expand.

## Flourishes

- **Boot sequence:** on first visit per session (`sessionStorage`), ~1.5s of fake startup lines, then panes appear staggered. Any key/click skips it; `prefers-reduced-motion` skips it entirely.
- **Blinking block cursor** in the focused pane title and after the about intro.
- No CRT scanlines, no typing animation (considered, rejected).

## Theming

- All colors via CSS custom properties (`--bg`, `--fg`, `--dim`, `--border`, `--accent`, plus 16 ANSI-style palette slots) under `[data-theme="..."]` blocks in `themes.css`.
- Default theme: **`andromeda`** — the user's ghostty "Tokyo Nebula Andromeda" palette (bg `#16161e`, palette colors incl. cyan `#00d4ff`, violet `#a78bfa`, blue `#7aa2f7`, yellow `#ffd866`), with body text promoted to palette 7 `#c0caf5` for readability and the theme's true foreground `#787c99` used as dim/secondary.
- Alternates: `catppuccin-mocha`, `gruvbox-dark`, `tokyo-night`, `green-phosphor`.
- `t` or clicking the status-bar theme name cycles themes; persisted in `localStorage`; inline `<head>` script applies the stored theme before first paint (no flash).

## Contact form

- Modal pane with name, email, message. Plain HTML validation (`required`, `type=email`).
- POSTs JSON to Web3Forms with the public access key (domain-bound; no secrets in repo).
- Honeypot field for spam (natively supported by Web3Forms).
- Terminal-style states: `sending…`, `✓ message sent`, `✗ failed — retry or email …` with mailto fallback link.

## Mobile (< ~800px)

- Grid collapses to one column in source order: header, about, now, work (tabs remain tabs, tappable), tech; status bar pinned to bottom as a tap-hint strip.
- Contact modal becomes full-screen.
- Now-pane ASCII art renders above the rows when it fits; hidden below 360px viewport width.

## Edge cases

- Empty collections (e.g. no projects) → pane renders a dim `// nothing here yet` line; build never fails.
- Missing required singletons (about, now) → build fails loudly.

## Testing

- **Vitest** for content-loading helpers.
- **Playwright** smoke test: pane focus cycling, tab switching, theme persistence, contact modal open/close, mobile viewport render.
- `astro build` in CI as the structural check.

## Deployment

Cloudflare Pages connected to the GitHub repo: `astro build`, output dir `dist/`. Editing flow: `npm run dev` → edit at `/keystatic` → commit → push → auto-deploy.

## Out of scope / future

- Vite 8 / Rolldown — adopt with the Astro 7 upgrade.
- Keystatic GitHub mode (editing from production) — not needed; local-dev editing only.
- CRT scanline toggle — rejected for now.
- Blog / additional pages.
