// F-015 REQ-034: which GitHub token a project uses. With team access, members use the project's shared token
// (saved by its Admins on the Team page); otherwise the device's own token, exactly as before.
import { getSession, projectKey, projectTokenOf } from './firebase';
import { store } from './store';
import { missingTokenMessage, pickToken } from './team';
import type { Project } from './types';

export function tokenFor(p: Pick<Project, 'repo'> | undefined): string | undefined {
  const own = store.get().settings.githubToken;
  if (!p?.repo) return own;
  return pickToken(own, projectTokenOf(projectKey(p.repo)), getSession().status === 'signed-in');
}

/** REQ-034 AC4: what to tell a signed-in person when a real project has no usable token, or null when nothing is
 *  missing (or sign-in is off: callers keep their usual behaviour). While the token loads, say so instead. */
export function missingToken(p: Pick<Project, 'repo' | 'demo'> | undefined): string | null {
  if (!p?.repo || p.demo || tokenFor(p) || getSession().status !== 'signed-in') return null;
  return projectTokenOf(projectKey(p.repo)) === undefined ? 'Loading the project token…' : missingTokenMessage(true);
}
