import { describe, expect, it } from 'vitest';
import {
  getAbout,
  getExperience,
  getHighlights,
  getNow,
  getProjects,
  getTech,
} from '../../src/lib/content';

const EMPTY = 'tests/fixtures/empty';

describe('content helpers', () => {
  it('reads the about singleton', async () => {
    const about = await getAbout();
    expect(about.name).toBeTruthy();
    expect(about.intro).toBeTruthy();
    expect(Array.isArray(about.links)).toBe(true);
  });

  it('reads now rows and art', async () => {
    const now = await getNow();
    expect(now.rows.length).toBeGreaterThan(0);
    expect(typeof now.art).toBe('string');
  });

  it('sorts projects by year descending', async () => {
    const projects = await getProjects();
    const years = projects.map((p) => p.year ?? '');
    expect(years).toEqual([...years].sort().reverse());
  });

  it('sorts experience by order ascending', async () => {
    const exp = await getExperience();
    const orders = exp.map((e) => e.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('returns [] for empty collections and optional singletons', async () => {
    expect(await getProjects(EMPTY)).toEqual([]);
    expect(await getExperience(EMPTY)).toEqual([]);
    expect(await getHighlights(EMPTY)).toEqual([]);
    expect(await getTech(EMPTY)).toEqual([]);
  });

  it('throws loudly when required singletons are missing', async () => {
    await expect(getAbout(EMPTY)).rejects.toThrow(/about/);
    await expect(getNow(EMPTY)).rejects.toThrow(/now/);
  });
});
