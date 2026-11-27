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
  return approvalBy(email, roles, gate, superAdmin)?.text ?? null;
}

/** The role an approval is signed with (the first of the person's roles that owns the gate, else "super admin") and the
 *  approvedBy text; null when the person may not pass the gate. The Firestore record uses `role` (REQ-037 AC3). */
export function approvalBy(email: string, roles: TeamRole[], gate: Gate, superAdmin = false): { role: string; text: string } | null {
  const role = GATE_ROLES[gate].find((r) => roles.includes(r)) || (superAdmin ? 'super admin' : null);
  return role ? { role, text: `${normalizeEmail(email)} (${role})` } : null;
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

/** The approvals already in spec.json when a project's first team is created (REQ-038 AC1): intents and test cases
 *  with an approvedBy, approved designs and requirements past Draft. Stored once in Firebase; approvals not in it and without a record are flagged later. */
/** The parts of spec.json that carry approvals: intents, designs, requirements and test cases. */
export interface ApprovalSpec {
  features: { id: string; idea?: { approvedBy?: string }; design?: { status: string; approvedBy?: string } }[];
  requirements: { id: string; status: string; approvedBy?: string; featureId?: string }[];
  tests?: { id: string; reqIds?: string[]; approvedBy?: string }[];
}

export function baselineFrom(spec: ApprovalSpec): BaselineApproval[] {
  return [
    ...spec.features.filter((f) => f.idea?.approvedBy).map((f) => ({ item: f.id, gate: 'intent' as const, approvedBy: f.idea?.approvedBy || '' })),
    ...spec.features.filter((f) => f.design?.status === 'Approved').map((f) => ({ item: f.id, gate: 'design' as const, approvedBy: f.design?.approvedBy || '' })),
    ...spec.requirements.filter((r) => r.status !== 'Draft').map((r) => ({ item: r.id, gate: 'requirements' as const, approvedBy: r.approvedBy || '' })),
    ...(spec.tests || []).filter((t) => t.approvedBy).map((t) => ({ item: t.id, gate: 'tests' as const, approvedBy: t.approvedBy || '' })),
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

/** What a person sees when no GitHub token is available for a project (REQ-034 AC4). With team access the fix is the
 *  project's shared token, so they are told to ask an Admin; without sign-in, to connect their own account. */
export function missingTokenMessage(signedIn: boolean): string {
  return signedIn ? "The project's GitHub token is missing or expired — ask an Admin" : 'Connect GitHub first';
}

/** A copy of the spec with these requirements In build; never changes the input. approveRun applies it to the store only
 *  after GitHub accepted the commit and the pull request (REQ-034 AC4: nothing half-written on an expired token). */
export function withReqsInBuild<S extends { requirements: { id: string; status: string }[] }>(spec: S, reqIds: string[] = []): S {
  return { ...spec, requirements: spec.requirements.map((q) => (reqIds.includes(q.id) ? { ...q, status: 'In build' } : q)) };
}

/** Shared projects to offer on this device (REQ-032 AC2): those the signed-in person may open whose repo is not a local
 *  project yet. Repos are compared case-insensitively, like GitHub. */
export function sharedToOpen<A extends { id: string; repo?: { owner: string; name: string } }>(access: A[], localRepos: ({ owner: string; name: string } | null | undefined)[]): A[] {
  const key = (r: { owner: string; name: string }) => `${r.owner}/${r.name}`.toLowerCase();
  const local = new Set(localRepos.filter((r): r is { owner: string; name: string } => !!r).map(key));
  return access.filter((a) => a.repo && !local.has(key(a.repo)));
}

/** Which gate approving an agent's run passes (REQ-033): the ideation run approves the intent, a coder (or reviewer)
 *  run starts a build, and so on. */
export function gateForAgent(agent: string): Gate {
  return ({ ideation: 'intent', requirements: 'requirements', designer: 'design', testdesign: 'tests', coder: 'build', reviewer: 'build', release: 'release' } as Record<string, Gate>)[agent] || 'build';
}

export type StartScreen = 'loading' | 'sign-in' | 'no-access' | 'role-picker' | 'app';

/** What the portal shows first (REQ-032, REQ-039, REQ-040). With sign-in on, roles come from the team: the role picker
 *  appears only inside the demo, which needs a signed-in person (the demo is never reachable before sign-in). */
export function startScreen(s: { firebase: boolean; status: string; demo: boolean; hasRole: boolean; hasAccess: boolean }): StartScreen {
  if (!s.firebase) return s.hasRole ? 'app' : 'role-picker';
  if (s.status === 'loading' || s.status === 'off') return 'loading';
  if (s.status !== 'signed-in') return 'sign-in';
  if (s.demo) return s.hasRole ? 'app' : 'role-picker';
  return s.hasAccess ? 'app' : 'no-access';
}

/** Which local projects a person sees (REQ-032 AC2, REQ-040 AC2/AC3). Sign-in off: all. In the demo: only the sample
 *  projects — never a real project, its team or its token. Otherwise: the super admin all, others their team projects. */
export function projectVisible(p: { repo: { owner: string; name: string } | null; demo?: boolean }, s: { status: string; demo?: boolean; superAdmin: boolean; accessIds: string[] }): boolean {
  if (s.status === 'off') return true;
  if (s.demo) return !!p.demo;
  if (s.superAdmin) return true;
  return !!p.repo && s.accessIds.includes(`${p.repo.owner}__${p.repo.name}`.toLowerCase());
}

/** "<email> (<role>)" → { email, role }; null for older free-text values such as "PO" or "the Product Owner". */
export function parseApprovedBy(s: string | undefined): { email: string; role: string } | null {
  const m = /^(\S+@\S+) \(([^)]+)\)$/.exec((s || '').trim());
  return m ? { email: normalizeEmail(m[1]), role: m[2] } : null;
}

export interface ApprovalEvidence {
  hasBaseline: boolean;
  baseline: BaselineApproval[];
  records: { items: string[]; gate: string; email: string; role: string }[];
}

/** Approvals in spec.json that Firebase does not confirm (REQ-038 AC2/AC4): neither in the baseline stored with the
 *  first team (same item, gate and approvedBy) nor matched by an approval record (same item, gate, email and role).
 *  No repo date is trusted. Without a baseline, every approval needs a record. */
export function unconfirmedApprovals(spec: ApprovalSpec, ev: ApprovalEvidence): BaselineApproval[] {
  // A record names the items its run approved: a test case is approved through its requirements (or their feature).
  const keysOf = (a: BaselineApproval): string[] => {
    if (a.gate !== 'tests') return [a.item];
    const reqIds = spec.tests?.find((t) => t.id === a.item)?.reqIds || [];
    const fids = spec.requirements.filter((r) => reqIds.includes(r.id)).map((r) => r.featureId || '').filter(Boolean);
    return [a.item, ...reqIds, ...fids];
  };
  return baselineFrom(spec).filter((a) => {
    if (ev.hasBaseline && ev.baseline.some((b) => b.item === a.item && b.gate === a.gate && b.approvedBy === a.approvedBy)) return false;
    const by = parseApprovedBy(a.approvedBy);
    if (!by) return true;
    const keys = keysOf(a);
    return !ev.records.some((r) => r.gate === a.gate && r.items.some((i) => keys.includes(i)) && normalizeEmail(r.email) === by.email && r.role === by.role);
  });
}

/** Whether the portal checks a project's approvals against Firebase (REQ-038 AC4): only for a signed-in person outside
 *  the demo, on a real (non-demo) GitHub project that has a team. Nothing is flagged otherwise. */
export function checksApprovals(x: { signedIn: boolean; demoSession: boolean; demoProject: boolean; hasRepo: boolean; hasTeam: boolean }): boolean {
  return x.signedIn && !x.demoSession && !x.demoProject && x.hasRepo && x.hasTeam;
}

/** The approval record a run saved (REQ-037 AC4): who wrote it and for which version of the run's output. */
export interface RunApproval { id: string; by: string; email: string; sig: string }

/** A short fingerprint of what a run asks to approve (its proposal and change set), so a revised version is approved anew. */
export function approvalSig(run: { proposal?: unknown; changes?: unknown }): string {
  const s = JSON.stringify([run.proposal ?? null, run.changes ?? []]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return `${s.length}-${h.toString(36)}`;
}

/** A retry may reuse the run's saved record only for the same signed-in person and the same, unrevised version. */
export function canReuseApproval(saved: RunApproval | undefined, email: string | undefined, sig: string): saved is RunApproval {
  return !!saved && !!email && !!saved.email && normalizeEmail(saved.email) === normalizeEmail(email) && saved.sig === sig;
}
