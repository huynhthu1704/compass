// REQ-109: the project list keeps only one demo project. Pure (types and the pure team rules) so node:test runs it directly.
import type { Project } from './types';
import { opensDemoSession } from './team.ts'; // pure, so node:test still runs this file

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

/** "Open demo project" / "Explore the demo" (REQ-109, ADR-022): signed in outside the demo, start the demo session
 *  first, on the demo project's route (ADR-026); then reuse or add the one demo project and open it. Effects are passed in so node:test checks the wiring. */
export function openDemo<T extends P>(
  projects: T[], create: () => T, session: { status: string; demo?: boolean },
  fx: { enterDemo: (entry: string) => void; addProject: (p: T) => void; go: (path: string) => void },
): T {
  const { project, isNew } = openOrCreateDemo(projects, create);
  if (opensDemoSession(session)) fx.enterDemo(`/p/${project.id}`); // ADR-026: the route the demo is opened on
  if (isNew) fx.addProject(project);
  fx.go(`/p/${project.id}`);
  return project;
}
