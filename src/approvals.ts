// F-015 Gates follow my roles (REQ-033) and every approval is recorded in Firebase first (REQ-036, REQ-037; ADR-012).
// With sign-in off, or for demo and local projects, nothing changes: gates are open and no record is written.
import { useEffect, useState } from 'react';
import { getSession, loadApprovalEvidence, projectKey, useSession, writeApprovalRecord } from './firebase';
import { approvalBy, baselineFrom, canPass, gateHint, unconfirmedApprovals, type BaselineApproval, type Gate } from './team';
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
export async function recordApproval(p: Pick<Project, 'repo' | 'demo'>, gate: Gate, items: string[]): Promise<{ text: string; id: string } | null> {
  if (!gated(p)) return null;
  const { roles, superAdmin, email } = rolesFor(p);
  const by = canPass(gate, roles, superAdmin) ? approvalBy(email, roles, gate, superAdmin) : null;
  if (!by) throw new Error(NOT_ALLOWED);
  let id: string;
  try { id = await writeApprovalRecord(projectKey(p.repo!), { items: items.length ? items : ['(none)'], gate, email, role: by.role }); }
  catch (e) { throw new Error((e as { code?: string }).code === 'permission-denied' ? NOT_ALLOWED : `Approval not recorded: ${(e as Error).message}`); }
  return { text: by.text, id };
}

/** Approvals in spec.json that Firebase does not confirm (REQ-038), for a signed-in person on a project with a team.
 *  Empty with sign-in off, in the demo, for local projects, or while the evidence loads. */
export function useUnconfirmed(p: Pick<Project, 'repo' | 'demo' | 'spec'>): BaselineApproval[] {
  const session = useSession();
  const key = p.repo && !p.demo && session.status === 'signed-in' && !session.demo ? projectKey(p.repo) : '';
  const hasTeam = !!key && session.access.some((a) => a.id === key);
  const approvals = JSON.stringify(baselineFrom(p.spec));
  const [list, setList] = useState<BaselineApproval[]>([]);
  useEffect(() => {
    if (!hasTeam) { setList([]); return; }
    let on = true;
    loadApprovalEvidence(key).then((ev) => { if (on) setList(unconfirmedApprovals(JSON.parse(JSON.stringify(p.spec)), ev)); }).catch(() => { if (on) setList([]); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check when the approvals in the spec change
  }, [key, hasTeam, approvals]);
  return list;
}
