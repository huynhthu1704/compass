// REQ-109: the project list keeps only one demo project. Pure (types-only imports) so node:test runs it directly.
import type { Project } from './types';

type P = Pick<Project, 'id' | 'demo'>;

/** The demo project already in the list, or a new one from `create` (REQ-109 AC1, AC2). */
export function openOrCreateDemo<T extends P>(projects: T[], create: () => T): { project: T; isNew: boolean } {
  const existing = projects.find((p) => p.demo);
  return existing ? { project: existing, isNew: false } : { project: create(), isNew: true };
}

/** Drops every demo project after the first (the most recently added); real projects are always kept (REQ-109 AC3). */
export function keepOneDemo<T extends P>(projects: T[]): T[] {
  let seen = false;
  return projects.filter((p) => !p.demo || (!seen && (seen = true)));
}
