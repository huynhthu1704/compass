// F-012 Delete a feature (REQ-016 … REQ-019) — TC-029, TC-030 (logic), TC-032 … TC-037.
// src/deleteFeature.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canConfirmDelete, deleteFeature, deleteSummary, featureFiles, matchIssues, removeFeature } from '../src/deleteFeature.ts';

const req = (id, featureId, status = 'Approved') => ({ id, featureId, title: `${id} title`, story: '', ac: ['Given\nWhen\nThen'], priority: 'Must', status });
const tc = (id, reqIds) => ({ id, reqIds, title: `${id} title`, gherkin: '', type: 'Automated', status: 'Not run' });
const run = (id, featureId, o = {}) => ({ id, agent: 'coder', stage: 'build', featureId, goal: 'g', status: 'awaiting-approval', mode: 'live', startedAt: '2026-11-26T00:00:00Z', steps: [], changes: [], guardrails: [], evals: [], ...o });
const spec = () => ({
  version: 2, stack: 'x',
  features: [{ id: 'F-001', name: 'Keep', idea: {}, createdAt: '' }, { id: 'F-002', name: 'Drop', idea: {}, createdAt: '' }],
  requirements: [req('REQ-001', 'F-001'), req('REQ-002', 'F-002'), req('REQ-003', 'F-002', 'Draft')],
  tests: [tc('TC-001', ['REQ-001']), tc('TC-002', ['REQ-002']), tc('TC-003', ['REQ-001', 'REQ-003']), tc('TC-004', ['REQ-003'])],
  decisions: [{ id: 'ADR-001', title: 't', decision: 'd', date: '2026-11-26', reqIds: ['REQ-001', 'REQ-002'] }, { id: 'ADR-002', title: 't', decision: 'd', date: '2026-11-26', reqIds: ['REQ-002'] }],
});
const project = (o = {}) => ({ id: 'p1', name: 'P', description: '', repo: { owner: 'o', name: 'r', defaultBranch: 'main', htmlUrl: '' }, frameworkInstalled: true, spec: spec(), dirty: false, runs: [run('r1', 'F-001'), run('r2', 'F-002', { prNumber: 7, prUrl: 'https://x/7' })], releases: [], createdAt: '', updatedAt: '', ...o });

test('TC-029 (REQ-016): Delete is enabled only after typing the exact feature id', () => {
  for (const typed of ['', 'f-012', 'F-01', 'F-012 ', ' F-012', 'F-0123']) assert.equal(canConfirmDelete(typed, 'F-012'), false, JSON.stringify(typed));
  assert.equal(canConfirmDelete('F-012', 'F-012'), true);
});

test('TC-030 (REQ-016): a confirmed delete removes the feature from the board; nothing happens before', async () => {
  const p = project({ repo: null });
  const before = JSON.stringify(p.spec);
  // Cancel / Esc simply never call deleteFeature: the spec object is untouched.
  assert.equal(JSON.stringify(p.spec), before);
  let applied;
  await deleteFeature(p, 'F-002', { apply: (s, r) => { applied = { s, r }; } });
  assert.deepEqual(applied.s.features.map((f) => f.id), ['F-001']);
});

test('TC-032 (REQ-017): spec clean-up removes the feature, its requirements, own tests and runs; shared items keep other ids', () => {
  const { spec: s, runs } = removeFeature(spec(), project().runs, 'F-002');
  assert.deepEqual(s.features.map((f) => f.id), ['F-001']);
  assert.deepEqual(s.requirements.map((r) => r.id), ['REQ-001']);
  assert.deepEqual(s.tests.map((t) => [t.id, t.reqIds]), [['TC-001', ['REQ-001']], ['TC-003', ['REQ-001']]]);
  assert.deepEqual(s.decisions.map((d) => [d.id, d.reqIds]), [['ADR-001', ['REQ-001']], ['ADR-002', []]]);
  assert.deepEqual(runs.map((r) => r.id), ['r1']);
  // the rules of check-spec: every test references a known requirement, every ADR too
  const ids = new Set(s.requirements.map((r) => r.id));
  for (const t of s.tests) { assert.ok(t.reqIds.length); for (const id of t.reqIds) assert.ok(ids.has(id)); }
  for (const d of s.decisions) for (const id of d.reqIds) assert.ok(ids.has(id));
});

test('TC-033 (REQ-017): one commit updates the spec and deletes only the feature files that exist', async () => {
  const commits = [];
  const gh = fakeGitHub({ tree: ['compass/spec.json', 'compass/intent/F-002.md', 'compass/features/F-002.md'], commits });
  let applied;
  await deleteFeature(project(), 'F-002', { token: 't', github: gh, specFiles: (p) => [{ path: 'compass/spec.json', action: 'update', content: JSON.stringify(p.spec) }], apply: (s, r, sha) => { applied = { s, r, sha }; }, today: '2026-11-26' });
  assert.equal(commits.length, 1);
  const [c] = commits;
  assert.equal(c.branch, 'main');
  assert.deepEqual(c.changes.filter((x) => x.action === 'delete').map((x) => x.path), ['compass/intent/F-002.md', 'compass/features/F-002.md']);
  assert.ok(!c.changes.some((x) => x.path === 'compass/design/F-002.md'));
  assert.ok(!JSON.parse(c.changes.find((x) => x.path === 'compass/spec.json').content).features.some((f) => f.id === 'F-002'));
  assert.deepEqual(featureFiles('F-002'), ['compass/intent/F-002.md', 'compass/features/F-002.md', 'compass/design/F-002.md']);
  assert.equal(applied.sha, 'c1');
});

test('TC-033 (REQ-017): a failed commit deletes nothing locally and closes no issue', async () => {
  const gh = fakeGitHub({ issues: [issue(1, 'REQ-002: x')], failCommit: true });
  let applied = false;
  await assert.rejects(deleteFeature(project(), 'F-002', { token: 't', github: gh, specFiles: () => [], apply: () => { applied = true; } }), /boom/);
  assert.equal(applied, false);
  assert.deepEqual(gh.closed, []);
});

test('TC-034 (REQ-017): demo projects and projects without a repo delete locally only', async () => {
  for (const p of [project({ demo: true }), project({ repo: null })]) {
    const gh = fakeGitHub({});
    let applied;
    const res = await deleteFeature(p, 'F-002', { token: 't', github: gh, specFiles: () => [], apply: (s) => { applied = s; } });
    assert.equal(gh.calls, 0);
    assert.equal(res.local, true);
    assert.ok(!applied.features.some((f) => f.id === 'F-002'));
  }
});

const issue = (number, title, o = {}) => ({ number, title, html_url: `https://github.com/o/r/issues/${number}`, ...o });

test('TC-035 (REQ-018): issue matching selects only the feature\'s open issues', () => {
  const issues = [
    issue(1, 'REQ-016: Delete a feature'),
    issue(2, 'REQ-016, REQ-017: two at once'),
    issue(3, 'REQ-016–REQ-019: everything (F-012)'),
    issue(4, 'REQ-0160: look-alike'),
    issue(5, 'Fix REQ-016 later'),
    issue(6, 'REQ-020: another feature'),
    issue(7, 'REQ-016: a pull request', { pull_request: {} }),
    issue(8, 'Delete feature follow-up (F-012)'),
    issue(9, 'F-0120 look-alike'),
    issue(10, 'REQ-010–REQ-020: wide range'),
  ];
  assert.deepEqual(matchIssues(issues, ['REQ-016', 'REQ-017', 'REQ-018', 'REQ-019'], 'F-012').map((i) => i.number), [1, 2, 3, 8, 10]);
  assert.deepEqual(matchIssues(issues, [], 'F-099').map((i) => i.number), []);
});

test('TC-036 (REQ-018): issues are commented and closed as not planned; refusals are listed and the feature is still deleted', async () => {
  const gh = fakeGitHub({ tree: [], issues: [issue(41, 'REQ-002: one'), issue(42, 'REQ-003: two'), issue(43, 'REQ-001: other feature')], refuse: 42 });
  let applied;
  const res = await deleteFeature(project(), 'F-002', { token: 't', github: gh, specFiles: () => [], apply: (s) => { applied = s; }, today: '2026-11-26' });
  assert.ok(!applied.features.some((f) => f.id === 'F-002'));
  assert.deepEqual(gh.comments.map((c) => c.n), [41]);
  assert.match(gh.comments[0].body, /deleted in Compass on 2026-11-26/);
  assert.deepEqual(gh.closed, [41]);
  assert.deepEqual(res.closed.map((i) => i.number), [41]);
  assert.deepEqual(res.stillOpen.map((i) => [i.number, i.url]), [[42, 'https://github.com/o/r/issues/42']]);
  assert.match(res.stillOpen[0].reason, /403/);
  const connect = readFileSync(new URL('../src/pages/Connect.tsx', import.meta.url), 'utf8');
  assert.match(connect, /Pull requests, Issues, Workflows/);
  const hint = readFileSync(new URL('../src/github.ts', import.meta.url), 'utf8');
  assert.match(hint, /Pull requests, Issues, Workflows \(and Actions, Pages\) to Read & write/);
});

test('TC-036 (REQ-018): when the issue list cannot be read, the feature is still deleted and the reason is shown', async () => {
  const gh = fakeGitHub({ tree: [], failIssues: true });
  let applied;
  const res = await deleteFeature(project(), 'F-002', { token: 't', github: gh, specFiles: () => [], apply: (s) => { applied = s; } });
  assert.ok(applied);
  assert.match(res.issueError, /403/);
});

test('TC-037 (REQ-019): warning only for built features or open pull requests; pull requests are never closed', async () => {
  const built = project();
  built.spec.requirements[1].status = 'In build';
  const s1 = deleteSummary(built, 'F-002');
  assert.deepEqual(s1.built.map((r) => r.id), ['REQ-002']);
  assert.deepEqual(s1.openPrs.map((r) => r.prNumber), [7]);
  assert.equal(s1.warn, true);
  const clean = project({ runs: [] });
  const s2 = deleteSummary(clean, 'F-002');
  assert.equal(s2.warn, false);
  assert.deepEqual(s2.requirements.map((r) => r.id), ['REQ-002', 'REQ-003']);
  assert.deepEqual(s2.tests.map((t) => t.id), ['TC-002', 'TC-004']);
  assert.deepEqual(s2.sharedTests.map((t) => t.id), ['TC-003']);
  const done = project({ runs: [run('r3', 'F-002', { prNumber: 9, status: 'done' })] });
  assert.deepEqual(deleteSummary(done, 'F-002').openPrs, []);
  const gh = fakeGitHub({ tree: [] });
  await deleteFeature(built, 'F-002', { token: 't', github: gh, specFiles: () => [], apply: () => {} });
  assert.deepEqual(gh.closed, []); // issue list is empty; and no pull request API exists in the fake
});

test('TC-038 (REQ-016): the dialog lists everything that will be removed', () => {
  const s = deleteSummary(project({ runs: [] }), 'F-002', [issue(1, 'REQ-002: one'), issue(2, 'REQ-001: other feature')]);
  assert.deepEqual(s.requirements.map((r) => [r.id, r.status]), [['REQ-002', 'Approved'], ['REQ-003', 'Draft']]);
  assert.deepEqual(s.tests.map((t) => t.id), ['TC-002', 'TC-004']);
  assert.deepEqual(s.sharedTests.map((t) => t.id), ['TC-003']);
  assert.deepEqual(s.files, ['compass/intent/F-002.md', 'compass/features/F-002.md', 'compass/design/F-002.md']);
  assert.deepEqual(s.issues.map((i) => i.number), [1]);
});

function fakeGitHub({ tree = [], issues = [], refuse, failCommit, failIssues, commits = [] }) {
  const gh = {
    calls: 0, comments: [], closed: [],
    async tree() { gh.calls++; return tree.map((path) => ({ path, type: 'blob', sha: 'x' })); },
    async commit(_t, _r, branch, message, changes) { gh.calls++; if (failCommit) throw new Error('boom'); commits.push({ branch, message, changes }); return { sha: 'c1', html_url: 'https://x/c1' }; },
    async openIssues() { gh.calls++; if (failIssues) throw new Error('GitHub 403: Resource not accessible'); return issues; },
    async commentIssue(_t, _r, n, body) { gh.calls++; if (n === refuse) throw new Error('GitHub 403: Resource not accessible'); gh.comments.push({ n, body }); },
    async closeIssue(_t, _r, n) { gh.calls++; if (n === refuse) throw new Error('GitHub 403: Resource not accessible'); gh.closed.push(n); },
  };
  return gh;
}
