// Compass traceability check — run in CI (`node compass/check-spec.mjs`). Exits 1 if the spec is inconsistent.
import { existsSync, readFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(new URL('./spec.json', import.meta.url), 'utf8'));
const errors = [];
const reqIds = new Set(spec.requirements.map((r) => r.id));

for (const r of spec.requirements) {
  if (!r.ac || r.ac.length === 0) errors.push(`${r.id} has no acceptance criteria`);
  if (r.status !== 'Draft' && !spec.tests.some((t) => t.reqIds.includes(r.id))) errors.push(`${r.id} (${r.status}) has no test case`);
}
for (const t of spec.tests) {
  if (!t.reqIds.length) errors.push(`${t.id} does not reference a requirement`);
  for (const id of t.reqIds) if (!reqIds.has(id)) errors.push(`${t.id} references unknown ${id}`);
}

// Intent first (compass/intent/): a requirement points to an intent file, either explicitly
// ("intent": "compass/intent/<file>.md") or through its feature (compass/intent/F-xxx.md, written by the portal).
// A requirement past Draft needs an intent whose status is Approved.
const readRepo = (p) => {
  const u = new URL(`../${p}`, import.meta.url);
  return existsSync(u) ? readFileSync(u, 'utf8') : null;
};
const approved = (text) => /^Status:\s*Approved\b/im.test(text);
for (const r of spec.requirements) {
  const explicit = r.intent;
  const file = explicit || (r.featureId ? `compass/intent/${r.featureId}.md` : null);
  if (!file) continue;
  const text = readRepo(file);
  if (text === null) {
    if (explicit) errors.push(`${r.id} points to a missing intent ${file}`);
    continue;
  }
  if (r.status !== 'Draft' && !approved(text)) errors.push(`${r.id} (${r.status}) points to ${file}, which is not Approved yet`);
}

// Decisions (ADR log): ids are unique and every ADR says what was decided
const adrIds = new Set();
for (const d of spec.decisions || []) {
  if (adrIds.has(d.id)) errors.push(`decision ${d.id} is duplicated`);
  adrIds.add(d.id);
  if (!d.title || !d.decision) errors.push(`decision ${d.id} needs a title and a decision`);
  for (const id of d.reqIds || []) if (!reqIds.has(id)) errors.push(`decision ${d.id} references unknown ${id}`);
}

if (errors.length) {
  console.error('Compass spec check failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log(`Compass spec OK: ${spec.requirements.length} requirements, ${spec.tests.length} tests, ${(spec.decisions || []).length} decisions`);
