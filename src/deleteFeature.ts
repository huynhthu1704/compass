/**
 * Delete a feature (F-012, REQ-016 … REQ-019): what goes, the spec clean-up, matching its GitHub issues,
 * and the whole delete with the GitHub calls injected. Pure (types-only imports), so Node runs it in the tests.
 */
import type { FileChange, Project, RepoRef, Requirement, Run, Spec, TestCase } from './types';

export interface IssueRef { number: number; title: string; html_url: string; pull_request?: unknown }
export interface IssueOutcome { number: number; title: string; url: string; reason?: string }

/** The GitHub calls a live delete needs (src/github.ts provides them). */
export interface DeleteGitHub {
  tree(token: string, repo: RepoRef): Promise<{ path: string }[]>;
  commit(token: string, repo: RepoRef, branch: string, message: string, changes: FileChange[]): Promise<{ sha: string; html_url: string }>;
  openIssues(token: string, repo: RepoRef): Promise<IssueRef[]>;
  commentIssue(token: string, repo: RepoRef, n: number, body: string): Promise<unknown>;
  closeIssue(token: string, repo: RepoRef, n: number): Promise<unknown>;
}
export interface DeleteDeps {
  token?: string;
  github?: DeleteGitHub;
  specFiles?: (p: Project) => FileChange[];
  /** Applies the new spec and runs to the store (after the commit, when there is one). */
  apply: (spec: Spec, runs: Run[], commitSha?: string) => void;
  today?: string;
}
export interface DeleteResult { local: boolean; closed: IssueOutcome[]; stillOpen: IssueOutcome[]; issueError?: string; commitUrl?: string }

/** REQ-016: Delete is enabled only when the typed text is exactly the feature id. */
export const canConfirmDelete = (typed: string, fid: string) => typed === fid;

/** The feature's files in the repo, written by the portal. */
export const featureFiles = (fid: string) => [`compass/intent/${fid}.md`, `compass/features/${fid}.md`, `compass/design/${fid}.md`];

const BUILT: Requirement['status'][] = ['In build', 'Done'];
/** A run still has an open pull request until it is released (done) or rejected. */
const openPr = (r: Run) => !!r.prNumber && r.status !== 'done' && r.status !== 'rejected';

/** REQ-016, REQ-019: what the dialog lists, and whether it warns. */
export function deleteSummary(p: Project, fid: string, issues: IssueRef[] = []) {
  const requirements = p.spec.requirements.filter((r) => r.featureId === fid);
  const ids = new Set(requirements.map((r) => r.id));
  const touched = p.spec.tests.filter((t) => t.reqIds.some((id) => ids.has(id)));
  const tests: TestCase[] = touched.filter((t) => t.reqIds.every((id) => ids.has(id)));
  const sharedTests: TestCase[] = touched.filter((t) => !t.reqIds.every((id) => ids.has(id)));
  const built = requirements.filter((r) => BUILT.includes(r.status));
  const openPrs = p.runs.filter((r) => r.featureId === fid && openPr(r));
  return { requirements, tests, sharedTests, built, openPrs, files: featureFiles(fid), issues: matchIssues(issues, [...ids], fid), warn: built.length > 0 || openPrs.length > 0 };
}

/** REQ-017: the spec and runs without the feature. Shared tests and ADRs keep only the other requirement ids. */
export function removeFeature(spec: Spec, runs: Run[], fid: string): { spec: Spec; runs: Run[] } {
  const ids = new Set(spec.requirements.filter((r) => r.featureId === fid).map((r) => r.id));
  return {
    spec: {
      ...spec,
      features: spec.features.filter((f) => f.id !== fid),
      requirements: spec.requirements.filter((r) => !ids.has(r.id)),
      tests: spec.tests.map((t) => ({ ...t, reqIds: t.reqIds.filter((id) => !ids.has(id)) })).filter((t) => t.reqIds.length > 0),
      decisions: spec.decisions.map((d) => (d.reqIds ? { ...d, reqIds: d.reqIds.filter((id) => !ids.has(id)) } : d)),
    },
    runs: runs.filter((r) => r.featureId !== fid),
  };
}

const reqNum = (id: string) => Number(/^REQ-(\d+)$/.exec(id)?.[1] ?? NaN);
/** REQ ids at the start of an issue title ("REQ-016: …", "REQ-016, REQ-017: …", "REQ-016–REQ-019: …"), as numbers. */
export function titleReqNumbers(title: string): number[] {
  const head = /^\s*(REQ-\d+(?:\s*(?:,|&|\band\b|–|—|-|\bto\b)\s*REQ-\d+)*)\s*:/.exec(title)?.[1];
  if (!head) return [];
  const out: number[] = [];
  for (const part of head.split(/\s*(?:,|&|\band\b)\s*/)) {
    const m = /^REQ-(\d+)(?:\s*(?:–|—|-|to)\s*REQ-(\d+))?$/.exec(part.trim());
    if (!m) continue;
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    for (let n = Math.min(a, b); n <= Math.max(a, b) && n - Math.min(a, b) < 1000; n++) out.push(n);
  }
  return out;
}

/** REQ-018: open issues (never pull requests) whose title starts with one of the REQ ids, or names the feature id. */
export function matchIssues(issues: IssueRef[], reqIds: string[], fid: string): IssueRef[] {
  const nums = new Set(reqIds.map(reqNum).filter((n) => !Number.isNaN(n)));
  const fidRe = new RegExp(`(?<![\\w-])${fid.replace(/[^\w-]/g, '')}(?![\\w])`);
  return issues.filter((i) => !i.pull_request && (titleReqNumbers(i.title).some((n) => nums.has(n)) || fidRe.test(i.title)));
}

export const deleteComment = (fid: string, name: string, today: string) =>
  `Feature ${fid} · ${name} was deleted in Compass on ${today}, so this issue is closed as not planned.\n\n---\n_Closed by the Compass portal_`;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * REQ-017, REQ-018: delete the feature. Live projects: one commit (spec, views, the feature's existing files deleted),
 * then the matched issues are commented on and closed as not planned; refusals are collected, never undo the delete.
 * If the commit fails, nothing is applied locally. Demo projects and projects without a repo change locally only.
 */
export async function deleteFeature(p: Project, fid: string, deps: DeleteDeps): Promise<DeleteResult> {
  const f = p.spec.features.find((x) => x.id === fid);
  if (!f) throw new Error(`Feature ${fid} not found`);
  const reqIds = p.spec.requirements.filter((r) => r.featureId === fid).map((r) => r.id);
  const { spec, runs } = removeFeature(p.spec, p.runs, fid);
  const { github: gh, token, specFiles } = deps;
  if (p.demo || !p.repo || !token || !gh || !specFiles) {
    deps.apply(spec, runs);
    return { local: true, closed: [], stillOpen: [] };
  }
  const repo = p.repo;
  let issues: IssueRef[] = [];
  let issueError: string | undefined;
  try { issues = matchIssues(await gh.openIssues(token, repo), reqIds, fid); } catch (e) { issueError = message(e); }
  const existing = new Set((await gh.tree(token, repo)).map((x) => x.path));
  const deletes: FileChange[] = featureFiles(fid).filter((path) => existing.has(path)).map((path) => ({ path, action: 'delete', content: '', reason: `${fid} deleted` }));
  const changes = [...specFiles({ ...p, spec, runs }), ...deletes];
  const c = await gh.commit(token, repo, repo.defaultBranch, `docs(compass): delete feature ${fid} — ${f.name}`, changes);
  deps.apply(spec, runs, c.sha);
  const today = deps.today || new Date().toISOString().slice(0, 10);
  const closed: IssueOutcome[] = [], stillOpen: IssueOutcome[] = [];
  for (const i of issues) {
    const out = { number: i.number, title: i.title, url: i.html_url };
    try {
      await gh.commentIssue(token, repo, i.number, deleteComment(fid, f.name, today));
      await gh.closeIssue(token, repo, i.number);
      closed.push(out);
    } catch (e) { stillOpen.push({ ...out, reason: message(e) }); }
  }
  return { local: false, closed, stillOpen, issueError, commitUrl: c.html_url };
}
