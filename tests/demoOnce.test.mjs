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
