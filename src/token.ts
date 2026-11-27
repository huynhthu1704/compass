// F-015 REQ-034: which GitHub token a project uses. With team access, members use the project's shared token
// (saved by its Admins on the Team page); otherwise the device's own token, exactly as before.
import { getSession, projectKey, projectTokenOf } from './firebase';
import { store } from './store';
import { pickToken } from './team';
import type { Project } from './types';

export function tokenFor(p: Pick<Project, 'repo'> | undefined): string | undefined {
  const own = store.get().settings.githubToken;
  if (!p?.repo) return own;
  return pickToken(own, projectTokenOf(projectKey(p.repo)), getSession().status === 'signed-in');
}
