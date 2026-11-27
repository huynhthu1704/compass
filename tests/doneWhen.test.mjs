// F-001 "Done when" instead of invented targets — TC-039, TC-040, TC-041 (REQ-020), TC-042 (REQ-021). ADR-005.
// src/ideaDraft.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demoBrief, demoIdea } from '../src/ideaDraft.ts';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const INVENTED = /\[baseline|\[target|baseline → target|\d+\s*%/i;

test('TC-039 (REQ-020): the Ideation agent asks for "Done when" and forbids invented numbers', () => {
  const src = read('src/harness.ts');
  const prompt = src.match(/id: 'ideation'[\s\S]*?system: `([\s\S]*?)` \}/)?.[1];
  assert.ok(prompt, 'the Ideation agent has a system prompt');
  assert.match(prompt, /Done when/);
  assert.match(prompt, /Never invent a baseline, target/);
  assert.match(prompt, /bet/, 'numbers only for a bet');
  assert.match(prompt, /optional "Signal to watch" without a target/);
  assert.doesNotMatch(prompt, /baseline → target, by when|measurable business outcome/);
  assert.match(src, /outcomeMetric: \{ type: 'string', description: 'Done when — /);
});

test('TC-040 (REQ-020): the offline draft has no baseline or target placeholders', () => {
  for (const need of ['travellers to add guide tips to their checklist', 'We need customers to pay online', 'cần quản lý chi phí chuyến đi']) {
    const idea = demoIdea(need);
    for (const k of ['intent', 'outcomeMetric', 'problem']) assert.doesNotMatch(idea[k], INVENTED, `${need}: ${k} = ${idea[k]}`);
    assert.match(idea.outcomeMetric, / can .* without manual work/);
    assert.doesNotMatch(idea.outcomeMetric, /^Done when/, 'the label is added by the page, not repeated in the text');
    assert.equal(idea.need, need);
  }
  assert.doesNotMatch(demoBrief('Share trip pages').outcomeMetric, INVENTED);
  // Numbers the Product Owner wrote herself are kept as a signal to watch, never turned into a new target
  const own = demoIdea('travellers to finish sign-up from 55% to 80%');
  assert.doesNotMatch(own.outcomeMetric, /^Done when/);
  // An arrow without any number is not a target (review nit on #62)
  assert.doesNotMatch(demoIdea('travellers to share check-in -> photo flow').outcomeMetric, /Signal to watch/);
  assert.match(own.outcomeMetric, /Signal to watch \(from the need\): travellers to finish sign-up from 55% to 80%$/);
  assert.doesNotMatch(read('src/harness.ts'), /\[baseline %\]|\[target %\]/, 'no placeholder left in the harness');
});

test('TC-041 (REQ-020): the installed AGENTS.md and intent template describe the Done-when rule', () => {
  const fw = read('src/framework.ts');
  const step = fw.match(/0b\. \*\*Business need → business intent:\*\*[^\n]*/)?.[0];
  assert.ok(step, 'the installed AGENTS.md has step 0b');
  assert.match(step, /\*\*Done when\*\*/);
  assert.match(step, /Never invent a baseline or target/);
  assert.match(step, /bet/);
  assert.doesNotMatch(step, /measurable business intent|baseline → target/);
  assert.ok(read('AGENTS.md').includes(step.replace(/\\`/g, '`')), "the repo's own AGENTS.md says the same");
  const readme = read('src/framework/intent-README.md');
  const template = readme.split('## Template').at(-1);
  assert.match(template, /^## Done when$/m);
  assert.doesNotMatch(template, /^## Success measure$/m);
  for (const row of [/Small feature[^\n]*with no target/, /Process or internal change[^\n]*`## Done when` only/, /A bet[^\n]*current value[^\n]*after a few weeks of real data/]) assert.match(readme, row);
});

test('TC-042 (REQ-021): the Idea page, run brief and generated files say "Done when"', () => {
  const idea = read('src/pages/Idea.tsx');
  assert.match(idea, /<Field label="Done when \(and optional signal to watch\)" help="What will be true when it is done\./);
  assert.match(idea, /<Field label="Business intent" help="Who, what changes — not the solution\.">/);
  assert.match(idea, /into a business intent \(who, what changes\) and what will be true when it is done/);
  assert.match(read('src/components/RunView.tsx'), /\*\*Done when:\*\* \$\{prop\.idea\.outcomeMetric\}/);
  const fw = read('src/framework.ts');
  assert.equal(fw.match(/## Done when\n\$\{i\.outcomeMetric/g)?.length, 2, 'features/F-xxx.md and intent/F-xxx.md');
  assert.match(read('src/rag.ts'), /\\nDone when: \$\{f\.idea\.outcomeMetric\}/);
  for (const f of ['src/pages/Idea.tsx', 'src/components/RunView.tsx', 'src/framework.ts', 'src/rag.ts']) {
    const t = read(f);
    assert.doesNotMatch(t, /Outcome metric|baseline → target|measurable business intent|## Success measure/, f);
  }
});
