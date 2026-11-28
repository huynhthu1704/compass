// TC-004 (REQ-004) — the repo's own compass/ scripts are exactly the copies the portal installs (src/framework/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAIRS = {
  'compass/check-spec.mjs': 'src/framework/check-spec.mjs',
  'compass/check-guardrails.mjs': 'src/framework/check-guardrails.mjs',
  'compass/guardrails-lib.mjs': 'src/framework/guardrails-lib.mjs',
  'compass/hooks/guard-edit.mjs': 'src/framework/guard-edit.mjs',
  'compass/REVIEW.md': 'src/framework/REVIEW.md',
  'compass/intent/README.md': 'src/framework/intent-README.md',
  'compass/plans/README.md': 'src/framework/plans-README.md',
  'compass/design/README.md': 'src/framework/design-README.md',
  '.claude/settings.json': 'src/framework/claude-settings.json',
  '.github/ISSUE_TEMPLATE/requirement.md': 'src/framework/issue-requirement.md',
  '.github/ISSUE_TEMPLATE/bug.md': 'src/framework/issue-bug.md',
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('TC-004: compass/ copies are identical to src/framework/', () => {
  const drift = Object.entries(PAIRS).filter(([copy, source]) => read(copy) !== read(source)).map(([copy, source]) => `${copy} differs from ${source}`);
  assert.deepEqual(drift, [], `Update both in the same PR:\n${drift.join('\n')}`);
});
