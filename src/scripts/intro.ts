// ---- cinematic intro sequence ----
// Three beats on first load (once per session, skippable):
//   A. boot log  — colored multi-stage terminal log
//   B. hero FLIP — hero fills the viewport, then glides into its grid slot
//   C. reveal    — pane borders draw (SVG), then text wipes in line-by-line
// Gating (.no-boot / .intro + a pre-paint fail-safe) lives in index.astro's
// inline head script; this module only runs the animation when .intro is set.

type BootEntry = { label: string; name: string; pending?: boolean };

const BOOT_ENTRIES: BootEntry[] = [
  { label: 'boot', name: 'kernel' },
  { label: 'boot', name: 'mount /panes' },
  { label: 'init', name: 'tui runtime' },
  { label: 'font', name: 'jetbrains-mono' },
  { label: 'theme', name: '%theme%' }, // resolved to the active theme name
  { label: 'net', name: 'hello@juppy.dev' },
  { label: 'load', name: 'content', pending: true },
  { label: 'gpu', name: 'backdrop-filter' },
  { label: 'a11y', name: 'focus model' },
  { label: 'sec', name: 'headers' },
];

const STEP_MS = 270; // delay between boot lines
const PENDING_MS = 650; // extra dwell on the lingering "load content" line
const READY_HOLD_MS = 500; // pause on "ready." before the hero takes over
const HERO_HOLD_MS = 600; // hero held fullscreen before it glides home
const HERO_GLIDE_MS = 650;
const PANE_STAGGER_MS = 120; // gap between successive panes materializing
const BORDER_DRAW_MS = 460;
const WIPE_MS = 240;
const WIPE_STAGGER_MS = 55; // gap between lines wiping within a pane

let skipped = false;
const pendingSleeps = new Set<() => void>();
const animations = new Set<Animation>();

// Sleep that resolves early when the sequence is skipped.
function sleep(ms: number): Promise<void> {
  return new Promise((res) => {
    if (skipped) return res();
    const done = () => {
      clearTimeout(id);
      pendingSleeps.delete(done);
      res();
    };
    const id = setTimeout(done, ms);
    pendingSleeps.add(done);
  });
}

// Track a WAAPI animation so it can be settled/cancelled on skip or finish.
function animate(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
): Animation {
  const a = el.animate(keyframes, { fill: 'forwards', ...options });
  animations.add(a);
  a.finished.catch(() => {}).then(() => animations.delete(a));
  return a;
}

// ---- phase A: boot log ----
async function bootLog(pre: HTMLPreElement): Promise<void> {
  const themeName = document.documentElement.dataset.theme ?? 'andromeda';
  for (const entry of BOOT_ENTRIES) {
    if (skipped) return;
    const name = entry.name === '%theme%' ? themeName : entry.name;
    const tag = appendLine(pre, entry.label, name, entry.pending);
    await sleep(entry.pending ? PENDING_MS : STEP_MS);
    if (entry.pending && !skipped) {
      tag.textContent = '[ OK ]';
      tag.className = 'boot-ok';
    }
  }
  if (skipped) return;
  const ready = document.createElement('span');
  ready.className = 'boot-ready';
  ready.textContent = 'ready.';
  pre.append(ready, document.createTextNode('\n'));
  await sleep(READY_HOLD_MS);
}

// Append one aligned log line; returns the status-tag span (for later flip).
function appendLine(
  pre: HTMLPreElement,
  label: string,
  name: string,
  pending?: boolean
): HTMLSpanElement {
  const dots = '.'.repeat(Math.max(3, 26 - name.length));
  const lead = document.createElement('span');
  lead.className = 'boot-dim';
  lead.textContent = `[${label.padEnd(4)}] ${name} ${dots} `;
  const tag = document.createElement('span');
  tag.className = pending ? 'boot-pending' : 'boot-ok';
  tag.textContent = pending ? '[ •• ]' : '[ OK ]';
  pre.append(lead, tag, document.createTextNode('\n'));
  return tag;
}

// ---- phase B: hero FLIP (fullscreen -> grid slot) ----
// The hero is a full-width strip at rest, so scaling the section barely enlarges
// it. Instead key the takeover off the ASCII art: blow the art up to ~60vw,
// centered, with the hero's glass chrome hidden, then glide it home.
async function heroFlip(hero: HTMLElement): Promise<void> {
  const art = hero.querySelector<HTMLElement>('.hero-art') ?? hero;
  const heroRect = hero.getBoundingClientRect();
  const artRect = art.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const artCx = artRect.left + artRect.width / 2;
  const artCy = artRect.top + artRect.height / 2;
  const scale = Math.min((vw * 0.62) / artRect.width, (vh * 0.5) / artRect.height);
  const dx = vw / 2 - artCx;
  const dy = vh / 2 - artCy;
  const big = `translate(${dx}px, ${dy}px) scale(${scale})`;

  // scale about the art's centre so the logo grows in place, not from the strip
  hero.style.transformOrigin = `${artCx - heroRect.left}px ${artCy - heroRect.top}px`;
  hero.classList.add('intro-hero');
  hero.style.transform = big; // instant: logo fills the screen
  await sleep(HERO_HOLD_MS);
  if (skipped) return;

  const a = animate(
    hero,
    [{ transform: big }, { transform: 'none' }],
    { duration: HERO_GLIDE_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
  );
  await a.finished.catch(() => {});
  hero.style.transform = '';
  hero.style.transformOrigin = '';
  hero.classList.remove('intro-hero'); // glass chrome fades back in as it lands
}

// ---- phase C: reveal panes (border draw + text wipe) ----
const SVG_NS = 'http://www.w3.org/2000/svg';

function drawBorder(pane: HTMLElement): Promise<void> {
  const w = pane.offsetWidth;
  const h = pane.offsetHeight;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pane-draw');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.style.width = `${w}px`;
  svg.style.height = `${h}px`;
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', '0.5');
  rect.setAttribute('y', '0.5');
  rect.setAttribute('width', `${w - 1}`);
  rect.setAttribute('height', `${h - 1}`);
  rect.setAttribute('rx', '11.5');
  rect.setAttribute('pathLength', '100');
  svg.append(rect);
  pane.append(svg);

  const a = animate(
    rect,
    [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }],
    { duration: BORDER_DRAW_MS, easing: 'ease-in-out' }
  );
  return a.finished.catch(() => {}).then(() => {
    if (skipped) return;
    pane.style.borderColor = 'var(--glass-border)'; // settle to the real border
    animate(svg, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 })
      .finished.catch(() => {})
      .then(() => svg.remove());
  });
}

function wipeContent(pane: HTMLElement): void {
  const title = pane.querySelector(':scope > .pane-title');
  const body = pane.querySelector(':scope > .pane-body');
  const targets = [
    ...(title ? [title] : []),
    ...(body ? [...body.children] : []),
  ];
  targets.forEach((el, i) => {
    animate(
      el,
      [
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0 0 0)' },
      ],
      { duration: WIPE_MS, delay: i * WIPE_STAGGER_MS, easing: 'ease-out' }
    );
  });
}

async function revealUI(): Promise<void> {
  // bars fade in
  document.querySelectorAll<HTMLElement>('.bar').forEach((bar) =>
    animate(bar, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' })
  );

  const panes = [...document.querySelectorAll<HTMLElement>('.pane')];
  for (const pane of panes) {
    if (skipped) return;
    pane.style.opacity = '1'; // surface appears; border still transparent
    drawBorder(pane).then(() => {
      if (!skipped) wipeContent(pane);
    });
    await sleep(PANE_STAGGER_MS);
  }
  // let the last pane's draw + wipe finish before cleanup
  await sleep(BORDER_DRAW_MS + WIPE_MS + panes.length * WIPE_STAGGER_MS);
}

// ---- skip / cleanup ----
function finishIntro(): void {
  skipped = true;
  pendingSleeps.forEach((done) => done());
  pendingSleeps.clear();

  document.querySelector('#boot')?.remove();
  document.querySelectorAll('.pane-draw').forEach((svg) => svg.remove());

  const html = document.documentElement;
  const hero = document.querySelector<HTMLElement>('.hero');
  if (hero) {
    hero.classList.remove('intro-hero');
    hero.style.transform = '';
  }
  document.querySelectorAll<HTMLElement>('.pane').forEach((p) => {
    p.style.opacity = '';
    p.style.borderColor = '';
  });
  html.classList.remove('intro'); // base CSS (fully visible) takes over
  animations.forEach((a) => a.cancel());
  animations.clear();
}

export async function runIntro(): Promise<void> {
  const overlay = document.querySelector<HTMLElement>('#boot');
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!overlay || document.documentElement.classList.contains('no-boot')) {
    overlay?.remove();
    return;
  }
  sessionStorage.setItem('booted', '1');

  const skip = () => finishIntro();
  overlay.addEventListener('click', skip, { once: true });
  document.addEventListener('keydown', skip, { once: true });

  const pre = overlay.querySelector('pre')!;
  await bootLog(pre);
  if (skipped) return;

  overlay.remove();
  if (hero) {
    await heroFlip(hero);
    if (skipped) return;
  }
  await revealUI();
  if (!skipped) finishIntro();
}
