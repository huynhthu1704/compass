// TC-003 (REQ-003) — guardrails, plan check and edit hook rules (src/framework/guardrails-lib.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APPROVAL_LABEL, checkChange, decideEdit, dependenciesChanged, isCode, isPlanFile, matchesRule, planProblems } from '../src/framework/guardrails-lib.mjs';

const g = {
  protectedPaths: ['.github/workflows/', 'compass/guardrails.json'],
  forbiddenPaths: ['.env', 'secrets/'],
  maxFilesPerChange: 3,
  maxLinesPerFile: 10,
  requireHumanApprovalFor: ['delete', 'protected-path', 'dependency-change'],
  secretPatterns: ['sk-ant-[A-Za-z0-9_-]{10,}'],
};
const plan = '# Plan\n## Files\n- src/a.ts — x\n## Steps\n1. do\n## Risks\n- none known\n## Proof\n- npm test';

test('TC-003: path rules — folders end with "/", case-insensitive', () => {
  assert.ok(matchesRule('.github/workflows/ci.yml', '.github/workflows/'));
  assert.ok(matchesRule('Compass/Guardrails.json', 'compass/guardrails.json'));
  assert.ok(!matchesRule('compass/guardrails.json.bak', 'compass/guardrails.json'));
});

test('TC-003: checkChange — size, forbidden, protected, deletion, secrets, dependencies, long files', () => {
  const files = [
    { path: '.env', status: 'A', addedText: 'x' },
    { path: '.github/workflows/ci.yml', status: 'M', addedText: '' },
    { path: 'src/old.ts', status: 'D' },
    { path: 'src/a.ts', status: 'M', addedText: 'const k = "sk-ant-abcdefghijkl"', lines: 11 },
  ];
  const { errors, warnings } = checkChange(files, g, { depsChanged: true });
  const all = errors.join('\n');
  assert.match(all, /4 files changed — the limit is 3/);
  assert.match(all, /\.env is a forbidden path/);
  assert.match(all, /\.github\/workflows\/ci\.yml is a protected path/);
  assert.match(all, /src\/old\.ts is deleted/);
  assert.match(all, /src\/a\.ts adds text that looks like a secret/);
  assert.match(all, /dependencies changed/);
  assert.match(warnings.join('\n'), /src\/a\.ts has 11 lines/);
  // The human-approved label covers protected paths, deletions and dependencies — never forbidden paths or secrets
  const approved = checkChange(files.slice(1), g, { depsChanged: true, labels: [APPROVAL_LABEL] }).errors.join('\n');
  assert.doesNotMatch(approved, /protected path|deleted|dependencies changed/);
  assert.match(approved, /looks like a secret/);
  assert.ok(checkChange([{ path: '.env', status: 'A' }], g, { labels: [APPROVAL_LABEL] }).errors.length, 'forbidden even with the label');
});

test('TC-003: dependenciesChanged ignores scripts, catches dependency edits', () => {
  assert.ok(!dependenciesChanged('{"scripts":{}}', '{"scripts":{"test":"node --test"}}'));
  assert.ok(dependenciesChanged('{"devDependencies":{}}', '{"devDependencies":{"x":"1"}}'));
});

test('TC-003: plan check — plan file or PR body; placeholders rejected; docs need none', () => {
  const code = [{ path: 'src/a.ts' }];
  assert.ok(isCode('src/a.ts') && !isCode('README.md') && !isCode('compass/spec.json'));
  assert.ok(isPlanFile('compass/plans/REQ-1-x.md') && !isPlanFile('compass/plans/README.md'));
  assert.match(planProblems('', code)[0], /has no plan/);
  assert.deepEqual(planProblems('', code, { 'compass/plans/REQ-1-x.md': plan }), []);
  assert.deepEqual(planProblems('## Plan\n- Files: a\n- Steps: b\n- Risks: c\n- Proof: d', code), []);
  assert.match(planProblems('## Plan\n- Files: TBD\n- Steps: -\n- Risks: n/a\n- Proof: d', code)[0], /Files, Steps, Risks/);
  assert.match(planProblems('', code, { 'compass/plans/REQ-1-x.md': '## Files\n- TBD\n## Steps\n1. x\n## Risks\n- r\n## Proof\n- p' })[0], /Files/);
  assert.deepEqual(planProblems('', [{ path: 'README.md' }, { path: 'compass/spec.json' }]), [], 'docs-only change');
});

test('TC-003: edit hook — protected unless approved, forbidden always, secrets anywhere', () => {
  const root = mkdtempSync(join(tmpdir(), 'hook-'));
  try {
    const edit = (file_path, content = 'x') => ({ tool_input: { file_path, content } });
    assert.match(decideEdit(edit('compass/guardrails.json'), g, [], root).reason, /protected path/);
    assert.deepEqual(decideEdit(edit('compass/guardrails.json'), g, ['compass/guardrails.json'], root), { block: false });
    assert.match(decideEdit(edit('.env'), g, ['.env'], root).reason, /forbidden path/);
    assert.match(decideEdit(edit('src/a.ts', 'sk-ant-abcdefghijkl'), g, [], root).reason, /secret pattern/);
    assert.match(decideEdit(edit('/elsewhere/notes.md', 'sk-ant-abcdefghijkl'), g, [], root).reason, /secret pattern/, 'secrets are blocked outside the repo too');
    assert.deepEqual(decideEdit(edit('src/a.ts'), g, [], root), { block: false });
    assert.deepEqual(decideEdit(edit('../outside/.github/workflows/x.yml'), g, [], root), { block: false }, 'paths outside the repo are not protected');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
