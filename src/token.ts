// F-015 REQ-041: which GitHub token a project uses. With sign-in on, everyone uses the shared work token that super
// admins set on Connections (ADR-016); a token saved on the person's device is never used for a team project.
// With sign-in off, the device's own token, exactly as before.
import { firebaseEnabled, getSession, getWorkspace, projectKey } from './firebase';
import { setAuditSource } from './github';
import { store } from './store';
import { auditFor, missingTokenMessage, pickToken, usesSharedSettings } from './team';
import type { Project } from './types';

export function tokenFor(p: Pick<Project, 'repo'> | undefined): string | undefined {
  const own = store.raw().settings.githubToken;
  if (!p?.repo) return own;
  // Sign-in configured (outside the demo): the work token or nothing, also while signing in or out (second review of build 2a).
  return pickToken(own, getWorkspace()?.workToken, usesSharedSettings({ firebase: firebaseEnabled, demo: !!getSession().demo }));
}

/** REQ-041 AC5: what to tell a signed-in person when a real project has no usable token, or null when nothing is
 *  missing (or sign-in is off: callers keep their usual behaviour). While the shared settings load, say so instead. */
export function missingToken(p: Pick<Project, 'repo' | 'demo'> | undefined): string | null {
  if (!p?.repo || p.demo || tokenFor(p) || getSession().status !== 'signed-in') return null;
  return getWorkspace() === undefined ? 'Loading the shared settings…' : missingTokenMessage(true);
}

// REQ-042: with sign-in configured, a signed-in person outside the demo is named at the end of every commit and pull
// request Compass makes, with their roles on that project (the harness uses the gate's role after an approval).
setAuditSource((r) => {
  const s = getSession();
  return auditFor({ firebase: firebaseEnabled, demo: !!s.demo, signedIn: s.status === 'signed-in', email: s.email, superAdmin: s.superAdmin, roles: s.access.find((a) => a.id === projectKey(r))?.roles || [] });
});

/** REQ-042: the audit line after a gate — the approval record's "email (role)" — or null with sign-in off or in the demo. */
export function gateAudit(by: string | null | undefined): string | null {
  const s = getSession();
  return by ? auditFor({ firebase: firebaseEnabled, demo: !!s.demo, signedIn: s.status === 'signed-in', email: s.email, superAdmin: s.superAdmin, roles: [], gateBy: by }) : null;
}
