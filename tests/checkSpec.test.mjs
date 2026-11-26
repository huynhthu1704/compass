// TC-003 (REQ-003) — the spec check the portal installs into every repo (src/framework/check-spec.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../src/framework/check-spec.mjs', import.meta.url));
const APPROVED = 'Status: Approved (by the PO, 2026-11-26)\n';

/** Runs check-spec in a throw-away repo with the given spec and extra files; returns { ok, out }. */
function runCheck(spec, files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'check-spec-'));
  try {
    mkdirSync(join(root, 'compass'));
    copyFileSync(SCRIPT, join(root, 'compass/check-spec.mjs'));
    writeFileSync(join(root, 'compass/spec.json'), JSON.stringify({ decisions: [], features: [], ...spec }));
    for (const [p, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), text);
    }
    const r = spawnSync(process.execPath, [join(root, 'compass/check-spec.mjs')], { encoding: 'utf8' });
    return { ok: r.status === 0, out: r.stdout + r.stderr };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const req = (id, extra = {}) => ({ id, title: id, story: 's', ac: ['Given a\nWhen b\nThen c'], priority: 'Must', status: 'Approved', ...extra });
const tc = (id, reqIds) => ({ id, reqIds, title: id, gherkin: 'g', type: 'Automated', status: 'Pass' });

test('TC-003: a consistent spec passes', () => {
  const r = runCheck({ requirements: [req('REQ-001')], tests: [tc('TC-001', ['REQ-001'])] });
  assert.ok(r.ok, r.out);
  assert.match(r.out, /Compass spec OK: 1 requirements, 1 tests/);
});

test('TC-003: traceability — missing AC, untested requirement, orphan or unknown test case', () => {
  const r = runCheck({
    requirements: [req('REQ-001', { ac: [] }), req('REQ-002'), req('REQ-003', { status: 'Draft' })],
    tests: [tc('TC-001', ['REQ-001']), tc('TC-002', []), tc('TC-003', ['REQ-999'])],
  });
  assert.ok(!r.ok);
  assert.match(r.out, /REQ-001 has no acceptance criteria/);
  assert.match(r.out, /REQ-002 \(Approved\) has no test case/);
  assert.doesNotMatch(r.out, /REQ-003/, 'a Draft requirement does not need a test case yet');
  assert.match(r.out, /TC-002 does not reference a requirement/);
  assert.match(r.out, /TC-003 references unknown REQ-999/);
});

test('TC-003: intent — explicit file missing or not approved; feature intent F-xxx.md', () => {
  const tests = [tc('TC-1', ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004', 'REQ-005'])];
  const r = runCheck(
    {
      requirements: [
        req('REQ-001', { intent: 'compass/intent/missing.md' }),
        req('REQ-002', { intent: 'compass/intent/draft.md' }),
        req('REQ-003', { featureId: 'F-001' }),
        req('REQ-004', { intent: 'compass/intent/ok.md' }),
        req('REQ-005', { featureId: 'F-009' }),
      ],
      tests,
    },
    { 'compass/intent/draft.md': 'Status: Draft\n', 'compass/intent/ok.md': APPROVED, 'compass/intent/F-001.md': 'Status: Draft\n' },
  );
  assert.ok(!r.ok);
  assert.match(r.out, /REQ-001 points to a missing intent compass\/intent\/missing\.md/);
  assert.match(r.out, /REQ-002 \(Approved\) points to compass\/intent\/draft\.md, which is not Approved yet/);
  assert.match(r.out, /REQ-003 \(Approved\) points to compass\/intent\/F-001\.md, which is not Approved yet/);
  assert.doesNotMatch(r.out, /REQ-004/);
  assert.doesNotMatch(r.out, /REQ-005/, 'a feature intent file that was never generated is not required');
});

test('TC-003: design gate — no code before the feature or requirement design is approved', () => {
  const draftDesign = { status: 'Draft', summary: '', screens: [{ id: 'SCR-1', name: 'x', purpose: '', reqIds: ['REQ-404'], elements: [], states: [] }] };
  const r = runCheck(
    {
      features: [{ id: 'F-001', name: 'f', idea: {}, design: draftDesign }],
      requirements: [
        req('REQ-001', { featureId: 'F-001', status: 'In build' }),
        req('REQ-002', { featureId: 'F-001', status: 'Approved' }),
        req('REQ-003', { status: 'Done', design: 'compass/design/d.md' }),
        req('REQ-004', { status: 'In build', design: 'none: CI only' }),
        req('REQ-005', { status: 'Approved', design: 'compass/design/missing.md' }),
      ],
      tests: [tc('TC-1', ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004', 'REQ-005'])],
    },
    { 'compass/design/d.md': 'Status: Draft\n' },
  );
  assert.ok(!r.ok);
  assert.match(r.out, /REQ-001 \(In build\) started before the design of F-001 was approved \(it is Draft\)/);
  assert.doesNotMatch(r.out, /REQ-002 \(Approved\) started/, 'Approved is not started');
  assert.match(r.out, /design F-001 SCR-1 references unknown REQ-404/);
  assert.match(r.out, /REQ-003 \(Done\) points to compass\/design\/d\.md, which is not Approved yet/);
  assert.doesNotMatch(r.out, /REQ-004/, '"none: <reason>" needs no design file');
  assert.match(r.out, /REQ-005 points to a missing design compass\/design\/missing\.md/);
});

test('TC-003: design gate passes once the design is approved', () => {
  const r = runCheck({
    features: [{ id: 'F-001', name: 'f', idea: {}, design: { status: 'Approved', summary: '', screens: [] } }],
    requirements: [req('REQ-001', { featureId: 'F-001', status: 'In build' })],
    tests: [tc('TC-1', ['REQ-001'])],
  });
  assert.ok(r.ok, r.out);
});

test('TC-003: ADR log — duplicate ids, missing decision, unknown requirement', () => {
  const r = runCheck({
    requirements: [req('REQ-001')],
    tests: [tc('TC-1', ['REQ-001'])],
    decisions: [
      { id: 'ADR-001', title: 't', decision: 'd', date: '2026-11-26' },
      { id: 'ADR-001', title: 't', decision: 'd', date: '2026-11-26' },
      { id: 'ADR-002', title: 't', decision: '', date: '2026-11-26', reqIds: ['REQ-404'] },
    ],
  });
  assert.ok(!r.ok);
  assert.match(r.out, /decision ADR-001 is duplicated/);
  assert.match(r.out, /decision ADR-002 needs a title and a decision/);
  assert.match(r.out, /decision ADR-002 references unknown REQ-404/);
});
