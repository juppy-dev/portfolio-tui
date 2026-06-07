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
