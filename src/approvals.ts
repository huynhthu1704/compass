// F-015 Gates follow my roles (REQ-033) and every approval is recorded in Firebase first (REQ-036, REQ-037; ADR-012).
// With sign-in off, or for demo and local projects, nothing changes: gates are open and no record is written.
import { getSession, projectKey, useSession, writeApprovalRecord } from './firebase';
import { approvedBy, canPass, gateHint, type Gate } from './team';
import type { Project } from './types';

/** Gates apply to signed-in people on real (GitHub) projects. */
const gated = (p: Pick<Project, 'repo' | 'demo'>) => !!p.repo && !p.demo && getSession().status === 'signed-in';

function rolesFor(p: Pick<Project, 'repo'>) {
  const s = getSession();
  return { roles: s.access.find((a) => a.id === projectKey(p.repo!))?.roles || [], superAdmin: s.superAdmin, email: s.email || '' };
}

/** May the signed-in person pass this gate here? `hint` is the text for a disabled button ("Needs the UX or PO role"). */
export function gateState(p: Pick<Project, 'repo' | 'demo'>, gate: Gate): { allowed: boolean; hint?: string } {
  if (!gated(p)) return { allowed: true };
  const { roles, superAdmin } = rolesFor(p);
  return canPass(gate, roles, superAdmin) ? { allowed: true } : { allowed: false, hint: gateHint(gate) };
}

/** Re-render a component when the session (and so the person's roles) changes. */
export const useGate = (p: Pick<Project, 'repo' | 'demo'>, gate: Gate) => { useSession(); return gateState(p, gate); };

export const NOT_ALLOWED = 'Not allowed for your roles';

/** Records an approval before anything else is written (REQ-037 AC1). Returns the approvedBy text ("ba@example.com (BA)"),
 *  or null when gates do not apply (sign-in off, demo or local project). Throws "Not allowed for your roles" when the
 *  person's roles do not own the gate, or when Firestore refuses the record (REQ-033 AC3, REQ-037 AC2). */
export async function recordApproval(p: Pick<Project, 'repo' | 'demo'>, gate: Gate, items: string[]): Promise<string | null> {
  if (!gated(p)) return null;
  const { roles, superAdmin, email } = rolesFor(p);
  const by = canPass(gate, roles, superAdmin) ? approvedBy(email, roles, gate, superAdmin) : null;
  if (!by) throw new Error(NOT_ALLOWED);
  const role = by.slice(by.lastIndexOf('(') + 1, -1);
  try { await writeApprovalRecord(projectKey(p.repo!), { items: items.length ? items : ['(none)'], gate, email, role }); }
  catch (e) { throw new Error((e as { code?: string }).code === 'permission-denied' ? NOT_ALLOWED : `Approval not recorded: ${(e as Error).message}`); }
  return by;
}
