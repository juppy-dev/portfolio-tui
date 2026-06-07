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
