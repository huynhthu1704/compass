// TC-045 (REQ-025) — Figma file layout: components only on the "Components" page, one section per feature. ADR-007.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('TC-045 (REQ-025): the design template, its installed copy and AGENTS.md state the Figma file layout', () => {
  for (const f of ['compass/design/README.md', 'src/framework/design-README.md', 'AGENTS.md']) {
    const text = read(f);
    assert.match(text, /"Components" page/, `${f} puts components on the Components page`);
    assert.match(text, /one section per feature|one Figma section/, `${f} asks for one Figma section per feature`);
  }
});
