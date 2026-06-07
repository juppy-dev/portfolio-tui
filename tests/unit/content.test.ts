import { describe, expect, it } from 'vitest';
import {
  getAbout,
  getCertifications,
  getEducation,
  getExperience,
  getHero,
  getHighlights,
  getNow,
  getProcesses,
  getProjects,
  getTech,
  getUses,
  getVitals,
} from '../../src/lib/content';

const EMPTY = 'tests/fixtures/empty';

describe('content helpers', () => {
  it('reads the about singleton', async () => {
    const about = await getAbout();
    expect(about.name).toBeTruthy();
    expect(about.intro).toBeTruthy();
    expect(Array.isArray(about.links)).toBe(true);
  });

  it('reads now rows and badge color', async () => {
    const now = await getNow();
    expect(now.rows.length).toBeGreaterThan(0);
    expect(now.artColor).toBeTruthy();
  });

  it('sorts projects by explicit order ascending', async () => {
    const projects = await getProjects();
    const orders = projects.map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
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

  it('reads hero art and tagline', async () => {
    const hero = await getHero();
    expect(hero?.art).toContain('█');
    expect(hero?.tagline).toBeTruthy();
  });

  it('reads uses rows', async () => {
    const rows = await getUses();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].key).toBeTruthy();
  });

  it('reads vitals rows and a 0-4 heatmap', async () => {
    const vitals = await getVitals();
    expect(vitals?.rows.length).toBeGreaterThan(0);
    expect(vitals?.heatmap.length).toBeGreaterThan(0);
    expect(vitals?.heatmap.every((v) => v >= 0 && v <= 4)).toBe(true);
  });

  it('reads processes with valid states', async () => {
    const procs = await getProcesses();
    expect(procs.length).toBeGreaterThan(0);
    expect(procs.every((p) => ['running', 'sleeping', 'zombie'].includes(p.state))).toBe(true);
  });

  it('tolerates missing new singletons', async () => {
    expect(await getHero(EMPTY)).toBeNull();
    expect(await getUses(EMPTY)).toEqual([]);
    expect(await getVitals(EMPTY)).toBeNull();
    expect(await getProcesses(EMPTY)).toEqual([]);
    expect(await getCertifications(EMPTY)).toEqual([]);
    expect(await getEducation(EMPTY)).toEqual([]);
  });

  it('reads certifications and education', async () => {
    const certs = await getCertifications();
    expect(certs.length).toBeGreaterThan(0);
    expect(certs[0].name).toBeTruthy();
    expect(certs.every((c) => c.category)).toBe(true);
    const edu = await getEducation();
    expect(edu.length).toBeGreaterThan(0);
    expect(edu[0].degree).toBeTruthy();
  });

  it('highlights carry categories for the sidebar grouping', async () => {
    const highlights = await getHighlights();
    expect(highlights.every((h) => h.category)).toBe(true);
  });
});
