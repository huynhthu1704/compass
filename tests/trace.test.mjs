// F-017 Collapsible agent trace (REQ-045) — TC-090, TC-091.
// src/trace.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traceDefaultOpen, traceOpen, traceSummary, traceToggleLabel } from '../src/trace.ts';

const step = (o = {}) => ({ t: '2026-11-27T00:00:00.000Z', kind: 'tool_call', title: 'a step', ...o });

test('TC-090 (REQ-045): the trace is open only while the run is working', () => {
  assert.equal(traceDefaultOpen('running'), true);
  for (const s of ['awaiting-approval', 'approved', 'rejected', 'failed', 'done']) assert.equal(traceDefaultOpen(s), false, s);
});

test('TC-090 (REQ-045): the folded header counts steps and failed steps', () => {
  const steps = Array.from({ length: 13 }, () => step()).concat(step({ ok: false }), step({ kind: 'error' }));
  assert.deepEqual(traceSummary(steps), { steps: 15, failed: 2, text: '15 steps · 2 failed' });
  assert.deepEqual(traceSummary([step(), step({ ok: true })]), { steps: 2, failed: 0, text: '2 steps' });
  assert.equal(traceSummary([step()]).text, '1 step');
});

test('TC-090 (REQ-045): the toggle flips the trace and her choice survives a status change', () => {
  assert.equal(traceToggleLabel(false), 'Show steps');
  assert.equal(traceToggleLabel(true), 'Hide steps');
  // no manual choice: follows the status (running → awaiting-approval folds)
  assert.equal(traceOpen('running', null), true);
  assert.equal(traceOpen('awaiting-approval', null), false);
  // she opened it while it was awaiting approval, then it finished: stays open
  assert.equal(traceOpen('awaiting-approval', true), true);
  assert.equal(traceOpen('done', true), true);
  // she folded it while running: stays folded
  assert.equal(traceOpen('running', false), false);
});

test('TC-091 (REQ-045): the toggle is an accessible button and step details still expand', () => {
  const src = readFileSync(new URL('../src/components/RunView.tsx', import.meta.url), 'utf8');
  assert.match(src, /traceOpen\(/);
  assert.match(src, /<button[^>]*aria-expanded=\{traceIsOpen\}[^>]*aria-controls=\{traceId\}/);
  assert.match(src, /\{traceIsOpen && <div id=\{traceId\} className="timeline"/);
  assert.match(src, /<details>/, 'each step keeps its own details');
});
