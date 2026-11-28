// F-015 REQ-041: which GitHub token a project uses. With sign-in on, everyone uses the shared work token that super
// admins set on Connections (ADR-016); a token saved on the person's device is never used for a team project.
// With sign-in off, the device's own token, exactly as before.
import { getSession, getWorkspace } from './firebase';
import { store } from './store';
import { missingTokenMessage, pickToken } from './team';
import type { Project } from './types';

export function tokenFor(p: Pick<Project, 'repo'> | undefined): string | undefined {
  const own = store.raw().settings.githubToken;
  if (!p?.repo) return own;
  return pickToken(own, getWorkspace()?.workToken, getSession().status === 'signed-in' && !getSession().demo);
}

/** REQ-041 AC5: what to tell a signed-in person when a real project has no usable token, or null when nothing is
 *  missing (or sign-in is off: callers keep their usual behaviour). While the shared settings load, say so instead. */
export function missingToken(p: Pick<Project, 'repo' | 'demo'> | undefined): string | null {
  if (!p?.repo || p.demo || tokenFor(p) || getSession().status !== 'signed-in') return null;
  return getWorkspace() === undefined ? 'Loading the shared settings…' : missingTokenMessage(true);
}
