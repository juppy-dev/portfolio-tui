// Decorative btop-style telemetry mesh behind the hero logo. No real metrics —
// a mean-reverting random walk with occasional spikes, rendered as a dot matrix
// that scrolls left one column per tick (the stepped btop look). Color is read
// from the canvas `color` (theme --accent); brightness rises toward each crest.

const canvas = document.querySelector<HTMLCanvasElement>('.hero-graph');
const ctx = canvas?.getContext('2d') ?? null;

if (canvas && ctx) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CELL = 8; // px per dot cell
  const DOT = 4; // drawn dot size
  const TICK_MS = 700;

  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let values: number[] = []; // one 0..1 sample per column, oldest first
  let v = 0.4; // current walk position
  let rgb = '0,212,255';
  let timer: ReturnType<typeof setInterval> | undefined;

  function readColor(): void {
    const c = getComputedStyle(canvas!).color.match(/\d+/g);
    if (c && c.length >= 3) rgb = `${c[0]},${c[1]},${c[2]}`;
  }

  function step(): void {
    const spike = Math.random() < 0.08 ? Math.random() * 0.5 : 0;
    v += (Math.random() - 0.5) * 0.25 + (0.45 - v) * 0.1 + spike;
    v = Math.max(0.05, Math.min(1, v));
    values.push(v);
    while (values.length > cols) values.shift();
  }

  function resize(): void {
    const r = canvas!.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas!.width = Math.round(r.width * dpr);
    canvas!.height = Math.round(r.height * dpr);
    cols = Math.max(1, Math.floor(r.width / CELL));
    rows = Math.max(1, Math.floor(r.height / CELL));
    while (values.length < cols) step();
    if (values.length > cols) values = values.slice(-cols);
  }

  function draw(): void {
    readColor();
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    for (let c = 0; c < values.length; c++) {
      const lit = Math.round(values[c] * rows);
      const x = c * CELL + (CELL - DOT) / 2;
      for (let i = 0; i < lit; i++) {
        const t = lit > 1 ? i / (lit - 1) : 1; // 0 at base, 1 at crest
        ctx!.fillStyle = `rgba(${rgb},${0.12 + 0.55 * t})`;
        ctx!.fillRect(x, (rows - 1 - i) * CELL + (CELL - DOT) / 2, DOT, DOT);
      }
    }
  }

  function tick(): void {
    step();
    draw();
  }

  function start(): void {
    if (!reduce && !timer && !document.hidden) timer = setInterval(tick, TICK_MS);
  }
  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  resize();
  draw();
  start();

  new ResizeObserver(() => {
    resize();
    draw();
  }).observe(canvas);

  document.addEventListener('visibilitychange', () =>
    document.hidden ? stop() : start()
  );

  // recolor on theme switch (and repaint for reduced-motion users)
  new MutationObserver(draw).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
