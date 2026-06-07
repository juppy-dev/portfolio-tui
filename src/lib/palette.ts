/** Deterministic color cycle for badges and highlight stars. */
export const PALETTE_CYCLE = ['blue', 'red', 'yellow', 'green', 'violet', 'cyan'] as const;

export function cycleColor(i: number): string {
  return PALETTE_CYCLE[i % PALETTE_CYCLE.length];
}
