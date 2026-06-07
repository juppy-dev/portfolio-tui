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
| `SKIP_KEYSTATIC` | baked into `npm run build` | excludes the Keystatic admin from production builds (set it manually only if you call `astro build` directly) |

## Deploy (Cloudflare Pages)

This is a static site — deploy as a **Pages** project, not a Worker (no adapter,
no SSR, no KV). The `build` script bakes in `SKIP_KEYSTATIC=true`, so the Keystatic
admin is excluded from production automatically.

1. Cloudflare → Workers & Pages → Create → **Pages** → connect the GitHub repo.
2. Framework preset: **Astro** · Build command: `npm run build` · Output directory: `dist`
3. Environment variable: `PUBLIC_WEB3FORMS_KEY=<your key>` (for the contact form).
4. Node is pinned to 22 via `.nvmrc`.
5. Every push to `main` auto-deploys.

## Keys

`tab` panes · `1-3` tabs · `j/k` move · `enter` expand · `c` contact ·
`d` resume · `t` theme · `?` help
