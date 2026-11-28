// F-015 REQ-109 — TC-509: only one demo project in the list.
// src/demoOnce.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keepOneDemo, openOrCreateDemo } from '../src/demoOnce.ts';

const real = (id) => ({ id, name: `Real ${id}` });
const demo = (id) => ({ id, name: 'Travel Journal', demo: true });

test('TC-509 (REQ-109 AC1): opening the demo reuses the demo project already in the list', () => {
  const list = [real('r1'), demo('d1')];
  let created = 0;
  const r = openOrCreateDemo(list, () => { created++; return demo('new'); });
  assert.equal(r.project.id, 'd1');
  assert.equal(r.isNew, false);
  assert.equal(created, 0, 'no new demo project is built');
});

test('TC-509 (REQ-109 AC2): with no demo project, one is created', () => {
  const r = openOrCreateDemo([real('r1')], () => demo('new'));
  assert.equal(r.project.id, 'new');
  assert.equal(r.isNew, true);
});

test('TC-509 (REQ-109 AC3): loading keeps the most recent demo project and every real project', () => {
  const saved = [demo('d2'), real('r1'), demo('d1'), real('r2')];
  assert.deepEqual(keepOneDemo(saved).map((p) => p.id), ['d2', 'r1', 'r2']);
  assert.deepEqual(keepOneDemo([real('r1'), real('r2')]).map((p) => p.id), ['r1', 'r2'], 'no demo: unchanged');
  assert.deepEqual(keepOneDemo([]), []);
});

// "Open demo project" for a signed-in person (ADR-022): the demo session starts when the demo project would be hidden.
import { opensDemoSession } from '../src/team.ts';
import { openDemo } from '../src/demoOnce.ts';

test('TC-509 (REQ-109 AC1/AC2, ADR-022): a signed-in person enters the demo session to open the demo project', () => {
  const base = { status: 'signed-in', demo: false };
  assert.equal(opensDemoSession(base), true, 'a team member starts the demo session');
  assert.equal(opensDemoSession({ ...base, superAdmin: true }), true, 'a super admin too: the demo is never mixed with real projects');
  assert.equal(opensDemoSession({ ...base, demo: true }), false, 'already in the demo');
  assert.equal(opensDemoSession({ status: 'off', demo: false }), false, 'a build without sign-in (no Firebase config) has no demo session');
});

test('TC-509 (REQ-109 AC1/AC2, REQ-040, ADR-022): "Open demo project" starts the demo session before opening the demo project', () => {
  const run = (projects, session) => {
    const calls = [];
    const fx = { enterDemo: () => calls.push('enterDemo'), addProject: (p) => calls.push(`add ${p.id}`), go: (path) => calls.push(`go ${path}`) };
    openDemo(projects, () => demo('new'), session, fx);
    return calls;
  };
  assert.deepEqual(run([real('r1')], { status: 'signed-in', demo: false }), ['enterDemo', 'add new', 'go /p/new'], 'signed in: demo session first, then one demo project added and opened');
  assert.deepEqual(run([real('r1'), demo('d1')], { status: 'signed-in', demo: false }), ['enterDemo', 'go /p/d1'], 'signed in with a demo project: no second copy');
  assert.deepEqual(run([demo('d1')], { status: 'signed-in', demo: true }), ['go /p/d1'], 'already in the demo: opens directly');
  assert.deepEqual(run([], { status: 'off' }), ['add new', 'go /p/new'], 'a build without sign-in: opens directly');
});
