// TC-310 (REQ-103, bug #31): the design view's Coverage must not warn about requirements whose design is "none: <reason>".
// src/designCoverage.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { designCoverage } from '../src/designCoverage.ts';

test('TC-310 (REQ-103): requirements that need no screen are not listed as uncovered', () => {
  const reqs = [
    { id: 'REQ-A', status: 'Approved' },
    { id: 'REQ-B', status: 'Approved' },
    { id: 'REQ-C', status: 'Approved', design: 'none: width only' },
    { id: 'REQ-D', status: 'In build', design: 'none:' },
    { id: 'REQ-E', status: 'Approved', design: 'compass/design/2026-11-27-e.md' },
  ];
  const c = designCoverage(reqs, [{ reqIds: ['REQ-A'] }]);
  assert.deepEqual(c.uncovered.map((r) => r.id), ['REQ-B', 'REQ-D', 'REQ-E'], '"none:" without a reason and a design file still need a screen');
  assert.deepEqual(c.noScreen, [{ id: 'REQ-C', reason: 'width only' }]);
  const all = designCoverage([{ id: 'REQ-C', status: 'Approved', design: 'none: width only' }], []);
  assert.equal(all.uncovered.length, 0);
});

test('TC-310 (REQ-103): the design view uses it', () => {
  const src = readFileSync(new URL('../src/framework.ts', import.meta.url), 'utf8');
  assert.match(src, /designCoverage\(reqs, d\.screens\)/);
  assert.match(src, /No screen needed/);
});
