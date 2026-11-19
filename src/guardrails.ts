/**
 * Evaluation & Guardrails layer.
 *  - Input guardrails: prompt-injection patterns in retrieved content.
 *  - Output guardrails: checks on every proposed change set before it can touch GitHub.
 *  - Evals: quality scores for spec artefacts and change sets.
 */
import { DEFAULT_GUARDRAILS } from './framework';
import type { EvalResult, FileChange, GuardrailResult, Requirement, Spec, TestCase } from './types';

export type GuardrailConfig = typeof DEFAULT_GUARDRAILS;

const INJECTION = /(ignore (all )?(previous|prior|above) instructions|disregard (the )?(system|previous)|you are now|reveal (your )?(system prompt|api key)|exfiltrate|send (the )?(token|key) to)/i;

export function scanInjection(texts: string[]): GuardrailResult {
  const hit = texts.find((t) => INJECTION.test(t));
  return hit
    ? { id: 'G0', name: 'Prompt-injection scan (retrieved context)', level: 'warn', message: `Suspicious instruction found in retrieved content: "${hit.match(INJECTION)?.[0]}". Treated as data, not instructions.` }
    : { id: 'G0', name: 'Prompt-injection scan (retrieved context)', level: 'pass', message: 'No instruction-like text in retrieved context.' };
}

export function checkChanges(changes: FileChange[], spec: Spec, cfg: GuardrailConfig = DEFAULT_GUARDRAILS, reqIds: string[] = []): GuardrailResult[] {
  const out: GuardrailResult[] = [];
  const secrets = cfg.secretPatterns.map((p) => new RegExp(p));
  const leaked = changes.filter((c) => c.action !== 'delete' && secrets.some((r) => r.test(c.content)));
  out.push(leaked.length ? { id: 'G1', name: 'Secret scanning', level: 'block', message: `Possible secret in ${leaked.map((c) => c.path).join(', ')}` } : { id: 'G1', name: 'Secret scanning', level: 'pass', message: 'No tokens, keys or private keys detected.' });

  const forbidden = changes.filter((c) => cfg.forbiddenPaths.some((p) => c.path === p || c.path.startsWith(p)));
  out.push(forbidden.length ? { id: 'G2', name: 'Forbidden paths', level: 'block', message: `Not allowed: ${forbidden.map((c) => c.path).join(', ')}` } : { id: 'G2', name: 'Forbidden paths', level: 'pass', message: 'No forbidden paths touched.' });

  const prot = changes.filter((c) => cfg.protectedPaths.some((p) => c.path.startsWith(p)));
  out.push(prot.length ? { id: 'G3', name: 'Protected paths', level: 'warn', message: `Needs explicit human approval: ${prot.map((c) => c.path).join(', ')}` } : { id: 'G3', name: 'Protected paths', level: 'pass', message: 'No CI/deploy or guardrail files changed.' });

  out.push(changes.length > cfg.maxFilesPerChange ? { id: 'G4', name: 'Change size', level: 'block', message: `${changes.length} files > limit ${cfg.maxFilesPerChange}. Split the work.` } : { id: 'G4', name: 'Change size', level: 'pass', message: `${changes.length} file(s) within limit ${cfg.maxFilesPerChange}.` });

  const long = changes.filter((c) => c.content.split('\n').length > cfg.maxLinesPerFile);
  out.push(long.length ? { id: 'G5', name: 'File length', level: 'warn', message: `Over ${cfg.maxLinesPerFile} lines: ${long.map((c) => c.path).join(', ')}` } : { id: 'G5', name: 'File length', level: 'pass', message: 'All files within the line limit.' });

  const dels = changes.filter((c) => c.action === 'delete');
  out.push(dels.length ? { id: 'G6', name: 'Deletions', level: 'warn', message: `Deletes ${dels.map((c) => c.path).join(', ')} — approval required.` } : { id: 'G6', name: 'Deletions', level: 'pass', message: 'No files deleted.' });

  const deps = changes.filter((c) => /(^|\/)package\.json$/.test(c.path) && c.before && JSON.stringify(JSON.parse(safe(c.before)).dependencies || {}) !== JSON.stringify(JSON.parse(safe(c.content)).dependencies || {}));
  out.push(deps.length ? { id: 'G7', name: 'Dependency changes', level: 'warn', message: 'Dependencies changed — review licences and supply-chain risk.' } : { id: 'G7', name: 'Dependency changes', level: 'pass', message: 'No dependency changes.' });

  if (cfg.requireRequirementReference) {
    const known = reqIds.filter((id) => spec.requirements.some((r) => r.id === id));
    out.push(known.length ? { id: 'G8', name: 'Requirement traceability', level: 'pass', message: `Linked to ${known.join(', ')}.` } : { id: 'G8', name: 'Requirement traceability', level: 'block', message: 'Change is not linked to any requirement in compass/spec.json.' });
    const notReady = spec.requirements.filter((r) => known.includes(r.id) && r.status === 'Draft');
    if (notReady.length) out.push({ id: 'G9', name: 'Requirement approval', level: 'warn', message: `${notReady.map((r) => r.id).join(', ')} still Draft — PO should approve before build.` });
  }
  return out;
}
const safe = (s: string) => { try { JSON.parse(s); return s; } catch { return '{}'; } };

export const blocked = (g: GuardrailResult[]) => g.some((x) => x.level === 'block');

// ---------- evals ----------
const GWT = /given[\s\S]*when[\s\S]*then/i;

export function evalRequirements(reqs: Requirement[]): EvalResult[] {
  if (!reqs.length) return [];
  const story = reqs.filter((r) => /as an? .+i want .+so that/i.test(r.story)).length;
  const ac = reqs.filter((r) => r.ac.length >= 2 && r.ac.every((a) => GWT.test(a))).length;
  const vague = reqs.filter((r) => /\b(fast|easy|user-friendly|etc|and\/or|appropriate|some)\b/i.test(r.story + r.ac.join(' '))).length;
  const must = reqs.filter((r) => r.priority === 'Must').length;
  return [
    { id: 'E1', name: 'User-story format (As a / I want / so that)', score: story, max: reqs.length, note: 'Every requirement states who, what and why.' },
    { id: 'E2', name: 'Testable acceptance criteria (≥2 Given/When/Then)', score: ac, max: reqs.length, note: 'AC must be verifiable by QA and automation.' },
    { id: 'E3', name: 'Unambiguous wording', score: reqs.length - vague, max: reqs.length, note: 'Flags vague words: fast, easy, user-friendly, etc.' },
    { id: 'E4', name: 'Prioritisation balance (Must ≤ 60%)', score: must / reqs.length <= 0.6 ? 1 : 0, max: 1, note: `${must}/${reqs.length} are Must.` },
  ];
}

export function evalTests(spec: Spec, tests: TestCase[] = spec.tests): EvalResult[] {
  const reqs = spec.requirements;
  const covered = reqs.filter((r) => tests.some((t) => t.reqIds.includes(r.id))).length;
  const traced = tests.filter((t) => t.reqIds.length && t.reqIds.every((id) => reqs.some((r) => r.id === id))).length;
  const neg = reqs.filter((r) => tests.some((t) => t.reqIds.includes(r.id) && /(invalid|error|fail|not|empty|missing|denied)/i.test(t.gherkin + t.title))).length;
  const gwt = tests.filter((t) => GWT.test(t.gherkin)).length;
  return [
    { id: 'E5', name: 'Requirement coverage', score: covered, max: reqs.length || 1, note: 'Every requirement has at least one test case.' },
    { id: 'E6', name: 'Traceability (test → requirement)', score: traced, max: tests.length || 1, note: 'Every test references an existing requirement.' },
    { id: 'E7', name: 'Negative-path coverage', score: neg, max: reqs.length || 1, note: 'Requirements with at least one error/edge test.' },
    { id: 'E8', name: 'Gherkin structure', score: gwt, max: tests.length || 1, note: 'Tests written as Given/When/Then.' },
  ];
}

export function evalChanges(changes: FileChange[], reqIds: string[]): EvalResult[] {
  const code = changes.filter((c) => !/\.(md|json)$/.test(c.path) && !c.path.startsWith('tests/'));
  const tests = changes.filter((c) => /(^|\/)tests?\/|\.(test|spec)\.[jt]sx?$/.test(c.path));
  const mentions = changes.filter((c) => reqIds.some((id) => c.content.includes(id) || (c.reason || '').includes(id))).length;
  return [
    { id: 'E9', name: 'Tests accompany code', score: code.length === 0 || tests.length > 0 ? 1 : 0, max: 1, note: `${tests.length} test file(s) for ${code.length} code file(s).` },
    { id: 'E10', name: 'Changes explain themselves', score: changes.filter((c) => (c.reason || '').length > 10).length, max: changes.length || 1, note: 'Each file has a reason linked to the plan.' },
    { id: 'E11', name: 'Requirement ids referenced', score: mentions, max: changes.length || 1, note: 'Files or reasons mention the REQ ids they deliver.' },
  ];
}

export const pct = (e: EvalResult[]) => (e.length ? Math.round((e.reduce((a, x) => a + x.score / x.max, 0) / e.length) * 100) : 0);
