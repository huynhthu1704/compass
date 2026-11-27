// F-009 Team floor (REQ-005 … REQ-009) — TC-005, TC-006, TC-012 and the computable parts of TC-007 … TC-011.
// src/teamFloor.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeFloor, PIPELINE } from '../src/teamFloor.ts';

const NOW = Date.parse('2026-11-26T12:00:00.000Z');
const ago = (s) => new Date(NOW - s * 1000).toISOString();
let n = 0;
const run = (agent, status, o = {}) => ({
  id: `r${++n}`, agent, stage: 'build', goal: o.goal ?? `${agent} goal`, status, mode: 'demo', startedAt: ago(o.startedAgo ?? 60),
  finishedAt: o.waitingAgo != null ? ago(o.waitingAgo) : undefined, proposal: o.proposal,
  steps: o.steps ?? [{ t: ago(o.startedAgo ?? 60), kind: 'plan', title: `${agent} started` }],
  changes: o.changes ?? [], guardrails: o.guardrails ?? [], evals: o.evals ?? [], featureId: o.featureId ?? 'F-009', reqIds: o.reqIds,
});
const project = (runs, releases = []) => ({ id: 'p1', spec: { features: [{ id: 'F-008', name: 'Own process' }, { id: 'F-009', name: 'Team floor' }] }, runs, releases });
const desk = (floor, agent) => floor.desks.find((d) => d.agent === agent);

test('TC-005 (REQ-005): desks follow each agent\'s latest run, in pipeline order with name, role and feature', () => {
  const p = project([
    run('ideation', 'done'),
    run('requirements', 'awaiting-approval'),
    run('designer', 'failed'),
    run('testdesign', 'approved'),
    run('coder', 'running', { steps: [{ t: ago(5), kind: 'tool_call', title: 'read_file(src/App.tsx)' }] }),
  ]);
  const f = computeFloor(p, 'all', NOW);
  assert.deepEqual(f.desks.map((d) => d.agent), ['ideation', 'requirements', 'designer', 'testdesign', 'coder', 'reviewer', 'release']);
  assert.deepEqual(f.desks.map((d) => d.role), ['PO', 'BA', 'UX', 'QA', 'Dev', 'QA', 'DM']);
  assert.deepEqual(f.desks.map((d) => d.state), ['done', 'waiting', 'rework', 'done', 'working', 'idle', 'idle']);
  assert.equal(desk(f, 'coder').name, 'Coding agent');
  assert.equal(desk(f, 'coder').featureId, 'F-009');
  assert.equal(desk(f, 'release').featureId, undefined);
  // the latest run wins
  const later = run('designer', 'running', { startedAgo: 10 });
  assert.equal(desk(computeFloor(project([...p.runs, later]), 'all', NOW), 'designer').state, 'working');
});

test('TC-005 (REQ-005): the summary counts update when a run changes state', () => {
  const r1 = run('coder', 'running');
  const r2 = run('requirements', 'awaiting-approval');
  let f = computeFloor(project([r1, r2]), 'all', NOW);
  assert.deepEqual(f.summary, { working: 1, waiting: 1, featuresInFlight: ['F-009'] });
  f = computeFloor(project([{ ...r1, status: 'awaiting-approval' }, r2]), 'all', NOW);
  assert.deepEqual(f.summary, { working: 0, waiting: 2, featuresInFlight: ['F-009'] });
});

test('TC-006 (REQ-005): the feature filter limits desks and counts to one feature', () => {
  const p = project([run('coder', 'running', { featureId: 'F-008' }), run('requirements', 'awaiting-approval', { featureId: 'F-009' })]);
  const all = computeFloor(p, 'all', NOW);
  assert.deepEqual(all.summary.featuresInFlight, ['F-008', 'F-009']);
  const f = computeFloor(p, 'F-009', NOW);
  assert.equal(desk(f, 'coder').state, 'idle');
  assert.equal(desk(f, 'requirements').state, 'waiting');
  assert.deepEqual(f.summary, { working: 0, waiting: 1, featuresInFlight: ['F-009'] });
});

test('TC-007 (REQ-006): the bubble shows the latest step, the activity list is newest first', () => {
  const coder = run('coder', 'running', { steps: [{ t: ago(30), kind: 'plan', title: 'Coding agent started' }, { t: ago(1), kind: 'tool_call', title: 'propose_file_change(src/x.ts)' }] });
  const reqs = run('requirements', 'awaiting-approval', { steps: [{ t: ago(20), kind: 'approval', title: 'Waiting for human approval' }] });
  const f = computeFloor(project([coder, reqs]), 'all', NOW);
  assert.equal(desk(f, 'coder').bubble, 'propose_file_change(src/x.ts)');
  assert.equal(desk(f, 'requirements').bubble, 'Please approve: requirements goal');
  assert.equal(desk(f, 'ideation').bubble, undefined);
  assert.deepEqual(f.activity.map((a) => a.title), ['propose_file_change(src/x.ts)', 'Waiting for human approval', 'Coding agent started']);
  assert.equal(f.activity[0].agentName, 'Coding agent');
  assert.ok(f.activity.length <= 12);
});

test('TC-008 (REQ-007): an approval sends a card forward; a blocked review sends it back to Coding', () => {
  const reqs = run('requirements', 'approved', { reqIds: ['REQ-005', 'REQ-006'], steps: [{ t: ago(2), kind: 'approval', title: 'Approved by human reviewer', ok: true }] });
  let f = computeFloor(project([reqs]), 'all', NOW);
  assert.deepEqual(f.handoffs.map(({ from, to, kind, label }) => ({ from, to, kind, label })), [{ from: 'requirements', to: 'designer', kind: 'forward', label: 'REQ-005, REQ-006' }]);
  assert.equal(computeFloor(project([reqs]), 'all', NOW + 10_000).handoffs.length, 0, 'old handoffs are not shown again');

  const blocked = run('coder', 'awaiting-approval', {
    guardrails: [{ id: 'G2', name: 'Traceability', level: 'block', message: 'no REQ id' }],
    steps: [{ t: ago(3), kind: 'guardrail', title: 'G2 Traceability: BLOCK', ok: false }, { t: ago(2), kind: 'approval', title: 'Waiting for human approval' }],
  });
  f = computeFloor(project([blocked]), 'all', NOW);
  assert.equal(desk(f, 'coder').state, 'rework');
  assert.equal(desk(f, 'reviewer').state, 'done');
  assert.deepEqual(f.handoffs.map(({ from, to, kind }) => ({ from, to, kind })), [{ from: 'reviewer', to: 'coder', kind: 'back' }]);
});

test('TC-008 (REQ-007): the Review desk works while the Coding run is being scored', () => {
  const scoring = run('coder', 'running', { steps: [{ t: ago(5), kind: 'tool_call', title: 'finish()' }, { t: ago(1), kind: 'eval', title: 'Evaluation: Traceability 5/5' }] });
  const f = computeFloor(project([scoring]), 'all', NOW);
  assert.equal(desk(f, 'reviewer').state, 'working');
  assert.equal(desk(f, 'reviewer').bubble, 'Evaluation: Traceability 5/5');
  const passed = run('coder', 'awaiting-approval', { guardrails: [{ id: 'G1', name: 'Scope', level: 'pass', message: 'ok' }] });
  assert.equal(desk(computeFloor(project([passed]), 'all', NOW), 'reviewer').state, 'done');
});

test('TC-009 / TC-012 (REQ-008): the approval desk lists every waiting run and opens the same run page', () => {
  const a = run('requirements', 'awaiting-approval', { featureId: 'F-009' });
  const b = run('designer', 'awaiting-approval', { featureId: 'F-008' });
  const f = computeFloor(project([a, b, run('coder', 'running')]), 'all', NOW);
  assert.deepEqual(f.approvals.map((x) => [x.runId, x.agentName, x.featureId]), [[a.id, 'Requirements agent', 'F-009'], [b.id, 'Design agent', 'F-008']]);
  assert.equal(desk(f, 'requirements').runId, a.id, 'a desk opens its own run');
  assert.equal(computeFloor(project([run('coder', 'running')]), 'all', NOW).approvals.length, 0, 'empty list → "Nothing waiting"');
  const page = readFileSync(new URL('../src/pages/TeamFloor.tsx', import.meta.url), 'utf8');
  assert.match(page, /go\(`\/p\/\$\{p\.id\}\/runs\/\$\{/, 'desks and Review & approve open /p/<id>/runs/<run id> — the Agent runs page');
  assert.match(page, /Nothing waiting/);
});

test('TC-010 / TC-011 (REQ-009): motion respects reduced motion and pause; the floor makes no requests', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'));
  assert.ok(css.includes('@media (prefers-reduced-motion: no-preference)'), 'animations sit inside a no-preference media query');
  assert.match(motion, /\.floor:not\(\.paused\)/, 'animations are switched off by Pause motion');
  const outside = css.slice(0, css.indexOf('@media (prefers-reduced-motion: no-preference)'));
  assert.ok(!/\.floor[^{]*\{[^}]*animation:/.test(outside), 'no floor animation outside the media query');
  assert.match(css, /@media \(max-width: 719px\)[^@]*\.floor-grid/, 'phone layout below 720 px');
  for (const f of ['src/teamFloor.ts', 'src/pages/TeamFloor.tsx']) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.ok(!/fetch\(|XMLHttpRequest|claude\(|startRun\(|approveRun\(|rejectRun\(/.test(src), `${f} makes no requests and runs no agent`);
  }
  assert.equal(PIPELINE.length, 7);
});

test('TC-008 (REQ-007): a warning is not a failed review; the injection scan is not review work', () => {
  const warned = run('coder', 'running', {
    guardrails: [{ id: 'G0', name: 'Prompt-injection scan (retrieved context)', level: 'warn', message: 'suspicious text' }],
    steps: [{ t: ago(2), kind: 'guardrail', title: 'Prompt-injection scan (retrieved context)', ok: false }],
  });
  const f = computeFloor(project([warned]), 'all', NOW);
  assert.equal(f.handoffs.length, 0, 'no card goes back for a warning');
  assert.equal(desk(f, 'reviewer').state, 'idle', 'the Review desk does not work on the start-of-run scan');
  assert.equal(desk(f, 'coder').state, 'working');
});

test('TC-012 (REQ-008): a run blocked by a guardrail is marked, so the floor offers to open it instead of approving', () => {
  const blockedRun = run('coder', 'awaiting-approval', { guardrails: [{ id: 'G3', name: 'Protected paths', level: 'block', message: '.github/' }] });
  const ok = run('requirements', 'awaiting-approval');
  const f = computeFloor(project([blockedRun, ok]), 'all', NOW);
  assert.deepEqual(f.approvals.map((a) => [a.agent, a.blocked]), [['coder', true], ['requirements', false]]);
  const page = readFileSync(new URL('../src/pages/TeamFloor.tsx', import.meta.url), 'utf8');
  assert.match(page, /a\.blocked \? 'Open run · blocked' : 'Open run to approve'/, 'the details panel offers "Open run to approve" or, for a blocked run, "Open run · blocked" (REQ-060, REQ-062)');
});

test('TC-007 (REQ-006): the newest step is announced politely, even before the list exists or when it is folded', () => {
  const page = readFileSync(new URL('../src/pages/TeamFloor.tsx', import.meta.url), 'utf8');
  const live = page.indexOf('aria-live="polite"');
  assert.ok(live > 0 && live < page.indexOf('<details'), 'the live region sits outside the collapsible activity list');
  assert.match(page.slice(live - 40, live + 120), /f\.activity\[0\]/);
});

// ---- F-009 approval details (REQ-060 … REQ-062, issue #38) ----
const H = 3600;
test('TC-300 (REQ-060): items carry goal and waiting time measured from when the run began waiting', () => {
  const runs = [
    run('requirements', 'awaiting-approval', { startedAgo: 24 * H, waitingAgo: 30, goal: 'goal now' }),
    run('designer', 'awaiting-approval', { startedAgo: 24 * H, waitingAgo: 6 * 60, goal: 'goal 6m' }),
    run('testdesign', 'awaiting-approval', { startedAgo: 24 * H, waitingAgo: 2 * H, goal: 'goal 2h' }),
    run('coder', 'awaiting-approval', { startedAgo: 72 * H, waitingAgo: 48 * H, goal: 'goal 2d' }),
  ];
  const f = computeFloor(project(runs), 'all', NOW);
  const byGoal = Object.fromEntries(f.approvals.map((a) => [a.goal, a]));
  assert.deepEqual(['goal now', 'goal 6m', 'goal 2h', 'goal 2d'].map((g) => byGoal[g].wait), ['now', '6m', '2h', '2d']);
  assert.equal(byGoal['goal 6m'].agentName, 'Design agent');
  assert.equal(byGoal['goal 6m'].featureId, 'F-009');
  const ninety = computeFloor(project([run('coder', 'awaiting-approval', { waitingAgo: 90 * 60 })]), 'all', NOW);
  assert.equal(ninety.approvals[0].wait, '1h', 'rounded down');
});

test('TC-302 (REQ-061): the 3 that have waited longest, then "+N more"', () => {
  const mk = (goal, startedH, waitingS) => run('ideation', 'awaiting-approval', { goal, startedAgo: startedH * H, waitingAgo: waitingS });
  const six = [mk('A', 5, 60), mk('B', 4, 3 * H), mk('C', 3, 2 * H), mk('D', 2, 90 * 60), mk('E', 1, 4 * H), mk('F', 0.5, 10 * 60)];
  const f = computeFloor(project(six), 'all', NOW);
  assert.deepEqual(f.approvalsShown.map((a) => a.goal), ['E', 'B', 'C']);
  assert.equal(f.approvalsMore, 3);
  assert.equal(f.approvals.length, 6);
  const three = computeFloor(project(six.slice(0, 3)), 'all', NOW);
  assert.equal(three.approvalsShown.length, 3);
  assert.equal(three.approvalsMore, 0);
  const page = readFileSync(new URL('../src/pages/TeamFloor.tsx', import.meta.url), 'utf8');
  assert.match(page, /go\(`\/p\/\$\{p\.id\}\/runs\?status=awaiting-approval`\)/, '"+N more" links to the filtered Agent runs');
  assert.match(page, /f\.approvalsMore > 0/);
});

test('TC-303 (REQ-061): Agent runs can show only the runs waiting for approval', () => {
  const runs = readFileSync(new URL('../src/pages/Runs.tsx', import.meta.url), 'utf8');
  assert.match(runs, /query\(\)\.get\('status'\) === 'awaiting-approval'/);
  assert.match(runs, /r\.status === 'awaiting-approval'/);
  assert.match(runs, /Show all runs/);
});

test('TC-306 (REQ-060): goals tell runs of one agent and feature apart; blocked runs are marked', () => {
  const a = run('ideation', 'awaiting-approval', { featureId: 'F-003', goal: 'Invite friends by link', waitingAgo: 120 });
  const b = run('ideation', 'awaiting-approval', { featureId: 'F-003', goal: 'Share a trip map', waitingAgo: 60 });
  const c = run('coder', 'awaiting-approval', { waitingAgo: 30, guardrails: [{ id: 'G3', name: 'Protected paths', level: 'block', message: '.github/' }] });
  const f = computeFloor(project([a, b, c]), 'all', NOW);
  assert.deepEqual(f.approvals.map((x) => [x.goal, x.blocked]), [['Invite friends by link', false], ['Share a trip map', false], ['coder goal', true]]);
});

test('TC-304 (REQ-062): the panel summary comes from the proposal and change set', () => {
  const reqs = run('requirements', 'awaiting-approval', { proposal: { requirements: [{}, {}, {}, {}, {}] } });
  const code = run('coder', 'awaiting-approval', { changes: [{ path: 'src/share.js' }, { path: 'tests/share.test.js' }],
    guardrails: [{ id: 'G1', name: 'Scope', level: 'pass', message: 'ok' }], evals: [{ id: 'E1', name: 'Tests accompany code', score: 1, max: 1, note: '' }] });
  const idea = run('ideation', 'awaiting-approval', { proposal: { idea: { intent: 'x' } } });
  const f = computeFloor(project([reqs, code, idea]), 'all', NOW);
  const by = Object.fromEntries(f.approvals.map((a) => [a.agent, a]));
  assert.equal(by.requirements.proposal, '5 requirements');
  assert.equal(by.coder.proposal, '2 files changed: src/share.js, tests/share.test.js');
  assert.equal(by.ideation.proposal, 'Idea brief');
  assert.deepEqual(by.coder.checks, ['G1 Scope: pass', 'Tests accompany code 1/1']);
});

test('TC-309 (REQ-062): the panel only opens the run page; it never approves or rejects', () => {
  const page = readFileSync(new URL('../src/pages/TeamFloor.tsx', import.meta.url), 'utf8');
  assert.match(page, /role="dialog"/);
  assert.match(page, /e\.key === 'Escape'/, 'Escape closes the panel');
  assert.match(page, /Open run to approve/);
  assert.match(page, /onClick=\{\(\) => open\(sel\.runId\)\}/, 'the panel button goes to /p/<id>/runs/<run id>');
  assert.doesNotMatch(page, /approveRun|rejectRun/);
});
