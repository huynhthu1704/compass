// F-015 Team access — the rules, as plain functions (REQ-030 … REQ-036).
// Pure module with types-only imports, so node:test runs it directly. The Firestore security rules repeat the gate
// table below; keep both in step.
import type { Role } from './types';

export type TeamRole = Role | 'Admin';
/** Roles in the order the Team page shows them. */
export const TEAM_ROLES: TeamRole[] = ['PO', 'BA', 'UX', 'QA', 'Dev', 'DM', 'Ops', 'Admin'];

export interface Member { email: string; roles: TeamRole[] }

/** The approval gates of the pipeline, plus managing the team and its token. */
export type Gate = 'intent' | 'requirements' | 'design' | 'tests' | 'build' | 'release' | 'team';

/** Which roles may pass each gate (REQ-033). The first role listed is named first in the hint. */
export const GATE_ROLES: Record<Gate, TeamRole[]> = {
  intent: ['PO'],
  requirements: ['PO', 'BA'],
  design: ['UX', 'PO'],
  tests: ['QA'],
  build: ['Dev'],
  release: ['DM', 'PO'],
  team: ['Admin'],
};

export const LAST_ADMIN = 'A project needs at least one Admin';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export type TeamResult = { ok: true; team: Member[]; replaceToken?: boolean } | { ok: false; team: Member[]; error: string };

const cleanRoles = (roles: TeamRole[]) => TEAM_ROLES.filter((r) => roles.includes(r));
const adminCount = (team: Member[]) => team.filter((m) => m.roles.includes('Admin')).length;
const find = (team: Member[], email: string) => team.findIndex((m) => normalizeEmail(m.email) === normalizeEmail(email));

/** Add a person by email with one or more roles (REQ-030). Never changes `team`. */
export function addMember(team: Member[], email: string, roles: TeamRole[]): TeamResult {
  const e = normalizeEmail(email);
  if (!isEmail(e)) return { ok: false, team, error: `"${email.trim()}" is not a valid email address` };
  const r = cleanRoles(roles);
  if (!r.length) return { ok: false, team, error: 'Tick at least one role' };
  if (find(team, e) >= 0) return { ok: false, team, error: `${e} is already on the team` };
  return { ok: true, team: [...team, { email: e, roles: r }] };
}

/** Change a person's roles (REQ-031). The last Admin keeps the Admin role. */
export function setRoles(team: Member[], email: string, roles: TeamRole[]): TeamResult {
  const i = find(team, email);
  if (i < 0) return { ok: false, team, error: `${normalizeEmail(email)} is not on the team` };
  const r = cleanRoles(roles);
  if (!r.length) return { ok: false, team, error: 'Tick at least one role' };
  if (team[i].roles.includes('Admin') && !r.includes('Admin') && adminCount(team) === 1) return { ok: false, team, error: LAST_ADMIN };
  return { ok: true, team: team.map((m, j) => (j === i ? { ...m, roles: r } : m)) };
}

/** Remove a person (REQ-031). The last Admin cannot be removed; a removal asks to replace the shared token (ADR-011). */
export function removeMember(team: Member[], email: string): TeamResult {
  const i = find(team, email);
  if (i < 0) return { ok: false, team, error: `${normalizeEmail(email)} is not on the team` };
  if (team[i].roles.includes('Admin') && adminCount(team) === 1) return { ok: false, team, error: LAST_ADMIN };
  return { ok: true, team: team.filter((_, j) => j !== i), replaceToken: true };
}

export interface Viewer { email: string; emailVerified: boolean }

/** True when the viewer's verified email is one of the super admin emails (REQ-035). */
export const isSuperAdmin = (viewer: Viewer | null | undefined, superAdmins: string[]) =>
  !!viewer?.emailVerified && superAdmins.map(normalizeEmail).includes(normalizeEmail(viewer.email));

/** The projects a signed-in person may open, with their roles there (REQ-032, REQ-035).
 *  Unverified emails get nothing; the super admin gets every project. */
export function accessFor<P extends { id: string; team: Member[] }>(projects: P[], viewer: Viewer | null | undefined, superAdmins: string[] = []) {
  if (!viewer?.emailVerified) return [];
  const e = normalizeEmail(viewer.email);
  const sa = isSuperAdmin(viewer, superAdmins);
  return projects.flatMap((p) => {
    const m = p.team.find((x) => normalizeEmail(x.email) === e);
    return m || sa ? [{ id: p.id, roles: m ? cleanRoles(m.roles) : [] as TeamRole[] }] : [];
  });
}

/** May someone with these roles pass this gate? (REQ-033) */
export const canPass = (gate: Gate, roles: TeamRole[], superAdmin = false) => superAdmin || GATE_ROLES[gate].some((r) => roles.includes(r));

/** The hint on a disabled gate button, e.g. "Needs the UX or PO role". */
export const gateHint = (gate: Gate) => `Needs the ${GATE_ROLES[gate].join(' or ')} role`;

/** approvedBy text for an approval (REQ-036): "<email> (<role>)", naming the person's role that owns the gate.
 *  Returns null when the person may not pass the gate, so no misleading audit entry can be written. */
export function approvedBy(email: string, roles: TeamRole[], gate: Gate, superAdmin = false): string | null {
  const role = GATE_ROLES[gate].find((r) => roles.includes(r)) || (superAdmin ? 'super admin' : null);
  return role ? `${normalizeEmail(email)} (${role})` : null;
}

// ---- Firestore team documents (F-015 Team page; same shape as firestore.rules → validProject) -----------------------

export interface TeamDoc { name: string; repo: { owner: string; name: string }; members: string[]; admins: string[]; team: Record<string, TeamRole[]> }

/** Team → Firestore document. Admin lives only in `admins` (one source of truth); role lists never hold 'Admin'. */
export function teamDoc(name: string, repo: { owner: string; name: string }, team: Member[]): TeamDoc {
  const members = team.map((m) => normalizeEmail(m.email));
  return {
    name,
    repo: { owner: repo.owner, name: repo.name },
    members,
    admins: team.filter((m) => m.roles.includes('Admin')).map((m) => normalizeEmail(m.email)),
    team: Object.fromEntries(team.map((m) => [normalizeEmail(m.email), cleanRoles(m.roles).filter((r) => r !== 'Admin')])),
  };
}

/** Firestore document → team, in member order. Admin comes from `admins` only; an 'Admin' in a role list is ignored. */
export function membersFromDoc(d: Partial<Pick<TeamDoc, 'members' | 'admins' | 'team'>>): Member[] {
  const admins = (d.admins || []).map(normalizeEmail);
  const team = d.team || {};
  const emails = d.members?.length ? d.members : Object.keys(team);
  return emails.map((e) => {
    const roles = (team[e] || []).filter((r) => r !== 'Admin');
    return { email: normalizeEmail(e), roles: cleanRoles([...roles, ...(admins.includes(normalizeEmail(e)) ? ['Admin' as const] : [])]) };
  });
}

export interface BaselineApproval { item: string; gate: Gate; approvedBy: string }

/** The approvals already in spec.json when a project's first team is created (REQ-038 AC1): approved designs and
 *  requirements past Draft. Stored once in Firebase; approvals not in it and without a record are flagged later. */
export function baselineFrom(spec: { features: { id: string; design?: { status: string; approvedBy?: string } }[]; requirements: { id: string; status: string; approvedBy?: string }[] }): BaselineApproval[] {
  return [
    ...spec.features.filter((f) => f.design?.status === 'Approved').map((f) => ({ item: f.id, gate: 'design' as const, approvedBy: f.design?.approvedBy || '' })),
    ...spec.requirements.filter((r) => r.status !== 'Draft').map((r) => ({ item: r.id, gate: 'requirements' as const, approvedBy: r.approvedBy || '' })),
  ];
}

/** One change to a team, applied to the team as it is in the database at save time (never to a stale copy). */
export type TeamOp = { kind: 'add'; email: string; roles: TeamRole[] } | { kind: 'set'; email: string; roles: TeamRole[] } | { kind: 'remove'; email: string };

/** Applies one change to the current team (REQ-030, REQ-031). A first team must name an Admin. */
export function applyTeamOp(current: Member[], op: TeamOp, isNew = false): TeamResult {
  const r = op.kind === 'add' ? addMember(current, op.email, op.roles) : op.kind === 'set' ? setRoles(current, op.email, op.roles) : removeMember(current, op.email);
  if (r.ok && !r.team.some((m) => m.roles.includes('Admin'))) return { ok: false, team: current, error: isNew ? 'Tick Admin for at least one person: a new team needs an Admin.' : LAST_ADMIN };
  return r;
}

/** The GitHub token to use for a project (REQ-034, ADR-011): with sign-in on, the project's shared token wins over the
 *  person's own device token; without sign-in (or no project token yet) the device token is used, as before. */
export function pickToken(own: string | undefined, projectToken: string | null | undefined, signedIn: boolean): string | undefined {
  return (signedIn && projectToken) || own || undefined;
}
