# Cinematic Intro Sequence — Design

**Date:** 2026-06-09
**Status:** Approved (design), pending implementation plan
**Area:** First-load animation for the terminal portfolio

## Goal

Expand the existing first-load "boot" animation into a three-beat cinematic
intro that tells a story: **system boots → identity asserts itself → the
workspace materializes around it.** Replace the current ~1.4s flat boot log
with a richer ~7.5s sequence that remains skippable and runs once per session.

Narrative beats:

1. **Boot log** — a longer, colored multi-stage boot log.
2. **Hero takeover** — the hero fills the screen, then shrinks and glides into
   its real grid slot (FLIP).
3. **UI materializes** — pane borders draw stroke-by-stroke (SVG), then pane
   text reveals line-by-line via a clip-wipe ("fast type").

## Non-goals

- No change to the underlying content, panes, or layout.
- No new dependencies (no animation libraries; CSS + small vanilla JS only).
- No per-character DOM typing (clip-wipe stands in for it — see Decisions).
- No mobile-specific choreography beyond honoring existing responsive/reduced
  states.

## Constraints & invariants (must be preserved)

- **Once per session.** Gated by `sessionStorage` (`booted` flag) — unchanged.
- **Reduced motion + repeat visits skip everything.** The inline head script
  already adds `.no-boot` for `prefers-reduced-motion` and repeat visits; those
  users see the final UI instantly with zero animation.
- **No flash of unstyled/hidden content.** The "hidden until animated" initial
  state must be applied pre-paint (inline head script), never by the deferred
  module.
- **Fail-safe.** If the JS module fails to load, the UI must still appear — the
  page must never be left permanently hidden.
- **Skippable.** A click or any keypress fast-forwards to the final UI state at
  any point in the sequence.
- **No new build deps.** Astro + vanilla TS + CSS only.

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Hero handoff (beat 2) | Continuous shrink (FLIP) | One unbroken, "physical" motion; transform-based so no layout jank. |
| Border reveal (beat 3) | True line-draw via SVG `stroke-dashoffset` | Authentic terminal/blueprint feel; bounded DOM (≤ ~9 elements). |
| Text reveal (beat 3) | Clip-wipe per direct child | Reads as lightning-fast typing with zero per-character DOM work / reflow. |
| Boot style (beat 1) | Colored multi-stage log with `[ OK ]` / `[ •• ]` status tags | Classic boot-log richness using the existing theme palette. |
| Clip-wipe granularity | Per direct child (paragraph / table row) | Per-line inside a wrapped paragraph isn't reliably addressable; a long wrapped paragraph wipes as one block. Revisit after build if it looks weak. |

## Gating & state model

The inline head script in `index.astro` runs before first paint and currently
decides `.no-boot`. Extended logic:

```
if (booted in sessionStorage || prefers-reduced-motion):
    html.classList.add('no-boot')      // existing: final UI instantly, no anim
else:
    html.classList.add('intro')        // new: hide panes/bars pre-paint
    setTimeout(() => html.classList.remove('intro'), 12000)  // fail-safe
```

- `.no-boot` → `#boot` hidden, normal CSS, no `.intro` → UI fully visible. (No
  change to repeat-visit / reduced-motion behavior.)
- `.intro` → CSS hides panes + bars (hero stays visible) so the boot log and
  hero takeover have a clean stage. The intro JS removes `.intro` when the
  sequence completes; the fail-safe timeout removes it regardless if JS dies.
- Removing `.intro` is idempotent (JS-finish and fail-safe may both fire).

`.intro` initial CSS state (illustrative):

```css
.intro .pane,
.intro .bar      { opacity: 0; }
.intro .pane     { border-color: transparent; } /* SVG draws the border */
/* .hero stays visible — it is the star of beat 2 */
```

Reduced-motion users never receive `.intro`, so the global
`@media (prefers-reduced-motion: reduce)` kill-switch already covers them.

## Orchestration

A new module `src/scripts/intro.ts` exports `runIntro()`:

```
runIntro():
  if html.no-boot: ensureFinalState(); return
  sessionStorage.booted = 1
  wire skip handler (click / keydown, once) -> finishIntro()
  await bootLog()     // Phase A
  await heroFlip()    // Phase B
  await revealUI()    // Phase C
  finishIntro()       // cleanup

finishIntro():        // idempotent
  cancel pending timers
  remove SVG overlays, clear hero transform
  reveal all pane content + borders + bars (final state)
  html.classList.remove('intro')
  remove #boot overlay
```

Every phase checks a shared `skipped` flag and bails to `finishIntro()` early.

`tui.ts` drops the current `BOOT_LINES` / `boot()` and calls `runIntro()` at the
same init point.

### Phase A — Boot log (~4.5s)

- Data: ~10–12 structured entries, e.g. `{ label, name, status, color }`,
  rendered monospace-aligned: `[boot] mount /panes ..... [ OK ]`.
- Status tags colored from the theme palette: green `OK`, yellow `••` (pending);
  labels/paths dim.
- One "heavier" step (load content) lingers on `••` then flips to `OK`.
- Ends on `ready.` + a short hold (~400ms).
- Lines stagger ~250–300ms apart.

### Phase B — Hero FLIP (~1.5s)

The real `.hero` element animates from fullscreen into its grid slot:

1. `rect = hero.getBoundingClientRect()`.
2. Compute a scale that fills ~80vw × ~70vh and a translate that centers the
   hero in the viewport (`transform-origin: center`).
3. Apply that transform **instantly** (no transition).
4. Hold fullscreen ~600ms.
5. Animate to `transform: none` over ~600ms with an ease-out curve.

Pure transform → no layout thrash. Panes/bars remain hidden beneath; the hero
floats on the existing body gradient (no extra overlay element needed). The
hero needs a raised `z-index` during the FLIP so it sits above the (hidden)
grid.

### Phase C — UI materializes (~1.5s)

As the hero settles:

1. Bars (`header`, `footer`) fade in.
2. Panes stagger in reading order (~120ms apart). Per pane:
   a. **Border draw** — an absolutely-positioned `<svg>` overlay covering the
      pane holds a `<rect>` (rounded `rx=12` to match `border-radius`,
      `fill: none`, stroke = the real border color, `vector-effect:
      non-scaling-stroke`). Use `pathLength="100"`, `stroke-dasharray: 100`,
      animate `stroke-dashoffset: 100 → 0`. Numeric perimeter fallback if
      `pathLength` on `<rect>` is unsupported.
   b. On border completion, swap: set the pane's real border to its normal
      color (instant) and remove the SVG — seamless if stroke width/color/radius
      match.
   c. **Content wipe** — each direct child of the pane body animates
      `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`, staggered, reading as
      line-by-line typing.

## Files touched

- `src/scripts/intro.ts` — **new.** `runIntro()` + phase helpers + skip/cleanup.
- `src/scripts/tui.ts` — remove `BOOT_LINES` + `boot()`; call `runIntro()`.
- `src/pages/index.astro` — head script: add `.intro` stamp + fail-safe timeout
  beside existing `.no-boot` logic. (`#boot` markup may gain structure for the
  richer log.)
- `src/styles/global.css` — `.intro` hidden states; FLIP transition; clip-wipe
  keyframes; SVG-overlay positioning; extended `#boot` log colors.

## Risks & mitigations

- **Permanently hidden UI if JS dies** → pre-paint fail-safe timeout removes
  `.intro`.
- **Long runtime annoying repeat viewers** → once-per-session + always
  skippable; brisk pacing.
- **Transform-scaled hero text looks soft mid-animation** → acceptable for a
  ~600ms transient; final resting state is untransformed and crisp.
- **Clip-wipe on long wrapped paragraphs wipes as a block** → accepted for now;
  user will judge after build and we adjust granularity if needed.
- **`pathLength` on `<rect>`** → numeric perimeter fallback.

## Success criteria

- First visit (motion allowed): boot log → fullscreen hero → hero glides into
  slot → borders draw → text wipes in; ends fully interactive. ~7.5s total.
- Click/keypress at any point jumps immediately to the final, interactive UI.
- Repeat visit and `prefers-reduced-motion`: final UI instantly, no animation.
- JS disabled / module load failure: UI visible (via fail-safe) within ~12s,
  fully usable.
- No new dependencies; existing tests still pass.
