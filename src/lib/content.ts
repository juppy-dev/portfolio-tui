import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

function reader(dir = process.cwd()) {
  return createReader(dir, keystaticConfig);
}

/** Required singleton — the page's spine. Build fails loudly if missing. */
export async function getAbout(dir?: string) {
  const about = await reader(dir).singletons.about.read();
  if (!about) throw new Error('Missing required content: about (content/about.yaml)');
  return about;
}

/** Required singleton — the page's spine. Build fails loudly if missing. */
export async function getNow(dir?: string) {
  const now = await reader(dir).singletons.now.read();
  if (!now) throw new Error('Missing required content: now (content/now.yaml)');
  return now;
}

export async function getHighlights(dir?: string) {
  return (await reader(dir).singletons.highlights.read())?.items ?? [];
}

export async function getTech(dir?: string) {
  return (await reader(dir).singletons.tech.read())?.groups ?? [];
}

export async function getProjects(dir?: string) {
  const entries = await reader(dir).collections.projects.all();
  return entries
    .map((e) => e.entry)
    .sort((a, b) => (b.year ?? '').localeCompare(a.year ?? ''));
}

export async function getExperience(dir?: string) {
  const entries = await reader(dir).collections.experience.all();
  return entries.map((e) => e.entry).sort((a, b) => a.order - b.order);
}

export async function getHero(dir?: string) {
  return await reader(dir).singletons.hero.read();
}

export async function getUses(dir?: string) {
  return (await reader(dir).singletons.uses.read())?.rows ?? [];
}

export async function getVitals(dir?: string) {
  return await reader(dir).singletons.vitals.read();
}

export async function getProcesses(dir?: string) {
  return (await reader(dir).singletons.processes.read())?.items ?? [];
}

export async function getCertifications(dir?: string) {
  return (await reader(dir).singletons.certifications.read())?.items ?? [];
}

export async function getEducation(dir?: string) {
  return (await reader(dir).singletons.education.read())?.items ?? [];
}
