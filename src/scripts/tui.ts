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
const TAB_ORDER = ['projects', 'experience', 'highlights', 'certification'];
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

/** Show the sub-content matching a subnav entry within its tab panel. */
function revealSub(entry: HTMLElement): void {
  const sub = entry.dataset.sub;
  if (!sub) return;
  entry
    .closest<HTMLElement>('[data-tab-panel]')
    ?.querySelectorAll<HTMLElement>('[data-sub-panel]')
    .forEach((p) => (p.hidden = p.dataset.subPanel !== sub));
}

function moveSelection(delta: number): void {
  const entries = visibleEntries();
  if (entries.length === 0) {
    panes[focusIdx].querySelector('.pane-body')?.scrollBy({ top: delta * 48 });
    return;
  }
  const current = entries.findIndex((el) => el.classList.contains('selected'));
  const next = Math.min(Math.max(current + delta, 0), entries.length - 1);
  entries.forEach((el, i) => el.classList.toggle('selected', i === next));
  entries[next].scrollIntoView({ block: 'nearest' });
  revealSub(entries[next]);
}

function revealSelected(): void {
  const selected = visibleEntries().find((el) => el.classList.contains('selected'));
  if (selected) revealSub(selected);
}

document.querySelectorAll<HTMLElement>('[data-entry] .entry-line').forEach((line) =>
  line.addEventListener('click', () => {
    const paneEl = line.closest<HTMLElement>('[data-pane]')!;
    focusPane(panes.indexOf(paneEl));
    const entry = line.closest<HTMLElement>('[data-entry]')!;
    visibleEntries().forEach((el) => el.classList.toggle('selected', el === entry));
    revealSub(entry);
  })
);

// ---- theme switcher ----
const THEMES = [
  'andromeda',
  'catppuccin-mocha',
  'gruvbox-dark',
  'tokyo-night',
  'green-phosphor',
];

// Display names where the data-theme key differs from the friendly label.
const THEME_LABELS: Record<string, string> = {
  andromeda: 'tokyo-nebula',
};

function syncThemeLabel(): void {
  const label = document.querySelector('[data-theme-label]');
  const theme = document.documentElement.dataset.theme ?? THEMES[0];
  if (label) label.textContent = THEME_LABELS[theme] ?? theme;
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

// ---- contact dialog ----
const contactDialog = document.querySelector<HTMLDialogElement>('#contact-dialog');
const contactForm = document.querySelector<HTMLFormElement>('#contact-form');
const contactStatus = document.querySelector<HTMLElement>('#contact-status');

document
  .querySelectorAll('[data-action="contact"]')
  .forEach((btn) => btn.addEventListener('click', () => contactDialog?.showModal()));

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

// Enter submits; Shift+Enter inserts a newline (textarea would otherwise eat Enter).
contactForm?.querySelector('textarea')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    contactForm?.requestSubmit();
  }
});

// ---- help dialog ----
const helpDialog = document.querySelector<HTMLDialogElement>('#help-dialog');

document
  .querySelector('[data-action="help"]')
  ?.addEventListener('click', () => helpDialog?.showModal());

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
    case '4':
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
    case 'Enter': {
      // Native activation owns Enter when a button/link is focused.
      if ((e.target as HTMLElement).closest?.('button, a')) break;
      revealSelected();
      break;
    }
    case 'c':
      e.preventDefault();
      contactDialog?.showModal();
      break;
    case 't':
      cycleTheme();
      break;
    case '?':
      helpDialog?.showModal();
      break;
    case 'd':
      if (activeTab() === 'experience') {
        document.querySelector<HTMLAnchorElement>('#resume-link')?.click();
      }
      break;
  }
});

// ---- clock ----
const TIMEZONE = 'Europe/Madrid';
const clockEl = document.querySelector<HTMLElement>('[data-clock]');

function tickClock(): void {
  if (!clockEl) return;
  // Derive the zone label too (CET vs CEST) so it stays correct across DST.
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE,
    timeZoneName: 'short',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  clockEl.textContent = `${get('timeZoneName')} ${get('hour')}:${get('minute')}`;
}

setInterval(tickClock, 60_000);

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
tickClock();
boot();
