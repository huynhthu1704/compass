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

/** Who joins and who leaves a team between two versions of it (REQ-041 AC3): their people/{email} records gain or lose
 *  this project in the same write as the team change. Emails are compared in lower case. */
export function peopleChanges(before: Member[], after: Member[]): { joined: string[]; left: string[] } {
  const b = new Set(before.map((m) => normalizeEmail(m.email))), a = new Set(after.map((m) => normalizeEmail(m.email)));
  return { joined: [...a].filter((e) => !b.has(e)), left: [...b].filter((e) => !a.has(e)) };
}

/** Applies one change to the current team (REQ-030, REQ-031). A first team must name an Admin. */
export function applyTeamOp(current: Member[], op: TeamOp, isNew = false): TeamResult {
  const r = op.kind === 'add' ? addMember(current, op.email, op.roles) : op.kind === 'set' ? setRoles(current, op.email, op.roles) : removeMember(current, op.email);
  if (r.ok && !r.team.some((m) => m.roles.includes('Admin'))) return { ok: false, team: current, error: isNew ? 'Tick Admin for at least one person: a new team needs an Admin.' : LAST_ADMIN };
  return r;
}

/** The GitHub token to use for a project (REQ-041 AC1, ADR-016): with sign-in on, the shared work token that super
 *  admins set, or nothing; a token saved on the person's device is never used for a team project. With sign-in off,
 *  the device token, exactly as before. */
export function pickToken(own: string | undefined, workToken: string | null | undefined, signedIn: boolean): string | undefined {
  return signedIn ? workToken || undefined : own || undefined;
}

/** What a person sees when no GitHub token is available (REQ-041 AC5): with sign-in on, only a super admin can set it. */
export function missingTokenMessage(signedIn: boolean): string {
  return signedIn ? 'No GitHub token yet — ask a super admin' : 'Connect GitHub first';
}

/** The shared settings that replace the device's own while someone is signed in, outside the demo (REQ-041 AC1, AC2,
 *  ADR-017): the Anthropic key (none → agents run in demo mode), the model and auto-sync the super admins chose.
 *  Null with sign-in off or in the demo: the device's settings apply, as before (AC7). */
export function workspaceSettings(ws: { anthropicKey?: string; model?: string; autoSync?: boolean } | null | undefined, ctx: { signedIn: boolean; demo: boolean }): { apiKey: string | undefined; model: string; autoSync: boolean } | null {
  if (!ctx.signedIn || ctx.demo) return null;
  return { apiKey: ws?.anthropicKey || undefined, model: ws?.model || 'claude-sonnet-5-5', autoSync: ws?.autoSync ?? true };
}

/** The audit line at the end of a commit or pull request made through Compass (REQ-042, ADR-016): who did it, with the
 *  role that passed the gate or their roles on the project. It helps people read GitHub's history; it is not proof. */
export function auditLine(email: string, roles: string[] | string): string {
  const r = Array.isArray(roles) ? roles.join(', ') : roles;
  return `Made in Compass by ${normalizeEmail(email)}${r ? ` (${r})` : ''}`;
}

/** Adds the audit line once, at the end; nothing when there is no line (sign-in off, the demo). Only a line already at
 *  the very end counts, so text written by an agent that mentions the phrase never replaces the real line. */
export function withAudit(text: string, line: string | null | undefined): string {
  if (!line) return text;
  const last = text.trimEnd().split('\n').pop() || '';
  if (last.startsWith('Made in Compass by ')) return text;
  return `${text.trimEnd()}\n\n${line}`;
}

/** Which audit line Compass adds (REQ-042): none with sign-in off, in the demo or when nobody is signed in; after a gate,
 *  the approval record's "email (role)"; otherwise the person's roles on the project ("super admin" when they are a super
 *  admin with no team roles). */
export function auditFor(ctx: { firebase: boolean; demo: boolean; signedIn: boolean; email?: string; superAdmin: boolean; roles: string[]; gateBy?: string | null }): string | null {
  if (!usesSharedSettings({ firebase: ctx.firebase, demo: ctx.demo }) || !ctx.signedIn || !ctx.email) return null;
  if (ctx.gateBy) return `Made in Compass by ${ctx.gateBy}`;
  return auditLine(ctx.email, ctx.roles.length ? ctx.roles : ctx.superAdmin ? ['super admin'] : []);
}

/** Whether the shared work token, key and settings apply (REQ-041 AC1, AC7): whenever sign-in is configured, outside
 *  the demo — also while signing in or after signing out, so a device token never reaches a team project meanwhile. */
export function usesSharedSettings(ctx: { firebase: boolean; demo: boolean }): boolean {
  return ctx.firebase && !ctx.demo;
}

/** Who may open Connections (REQ-041 AC2, REQ-110 AC2 as amended by ADR-020): with sign-in on, only super admins;
 *  with sign-in off or in the demo, everyone, as before. */
export function canOpenConnections(ctx: { signedIn: boolean; demo: boolean; superAdmin: boolean }): boolean {
  return !ctx.signedIn || ctx.demo || ctx.superAdmin;
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

/** The route part of a location hash: "#/p/abc?x=1" → "/p/abc"; empty → "/". */
export const routeOf = (hash: string) => hash.replace(/^#/, '').split('?')[0] || '/';

/** REQ-040 AC4, ADR-026: in the demo, before a role is picked, the role screen covers every route — so a navigation away
 *  from the route the demo was opened on (the browser Back button) leaves the demo instead of trapping the person. */
export function leavesDemoOnNavigate(s: { demo?: boolean; hasRole: boolean; entry?: string; route: string }): boolean {
  return !!s.demo && !s.hasRole && s.entry !== undefined && s.route !== s.entry;
}

/** ADR-022: a signed-in person, super admins included, opens the demo project only inside the demo session. */
export function opensDemoSession(s: { status: string; demo?: boolean }): boolean {
  return s.status === 'signed-in' && !s.demo;
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
  return baselineFrom(spec).filter((a) => {
    if (ev.hasBaseline && ev.baseline.some((b) => b.item === a.item && b.gate === a.gate && b.approvedBy === a.approvedBy)) return false;
    const by = parseApprovedBy(a.approvedBy);
    if (!by) return true;
    // Same item: a test case needs a record that names the test case itself (a run's record lists the TC ids it approved).
    return !ev.records.some((r) => r.gate === a.gate && r.items.includes(a.item) && normalizeEmail(r.email) === by.email && r.role === by.role);
  });
}

/** Whether approval gates apply to a project (REQ-033). They fail closed: with Firebase configured, a real (non-demo) GitHub
 *  project is gated even while the person is signing in or loading, so no gate is passed without a signed-in owner role. */
export function gatesApply(x: { firebase: boolean; status: string; hasRepo: boolean; demoProject: boolean }): boolean {
  return x.hasRepo && !x.demoProject && (x.firebase || x.status === 'signed-in');
}

type RepoName = { owner: string; name: string };
/** Why a shared project cannot be opened from its team entry (REQ-034): the project's token cannot reach the repository
 *  (GitHub answers 404 for a repo the token cannot see), or GitHub reports it under another owner/name (renamed or moved),
 *  which would no longer match the team. Null when it can be opened. */
export function sharedOpenProblem(expected: RepoName, got: RepoName | null, status?: number): string | null {
  const full = `${expected.owner}/${expected.name}`;
  if (status === 404 || !got) return `The project's GitHub token cannot reach ${full} — ask an Admin of the project to check the token on the Team page.`;
  if (got.owner.toLowerCase() !== expected.owner.toLowerCase() || got.name.toLowerCase() !== expected.name.toLowerCase())
    return `${full} is now ${got.owner}/${got.name} on GitHub (renamed or moved) — ask an Admin of the project to update its team.`;
  return null;
}

/** Whether the portal checks a project's approvals against Firebase (REQ-038 AC4): only for a signed-in person outside
 *  the demo, on a real (non-demo) GitHub project that has a team. Nothing is flagged otherwise. */
export function checksApprovals(x: { signedIn: boolean; demoSession: boolean; demoProject: boolean; hasRepo: boolean; hasTeam: boolean }): boolean {
  return x.signedIn && !x.demoSession && !x.demoProject && x.hasRepo && x.hasTeam;
}

/** The items an agent run's approval record names (REQ-038 "same item"): its requirements (or feature), plus the ids of
 *  any test cases it proposes, so each approved test case is confirmed by its own id. */
export function recordItems(run: { id: string; featureId?: string; reqIds?: string[]; proposal?: { tests?: { id: string }[] } }): string[] {
  const base = run.reqIds?.length ? run.reqIds : [run.featureId || run.id];
  return [...new Set([...base, ...(run.proposal?.tests || []).map((t) => t.id)])];
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
