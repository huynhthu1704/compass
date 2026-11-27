/**
 * Follow-ups on an agent run (F-020, REQ-050 … REQ-054): the reviewer quotes parts of the answer and asks for details
 * (Ask) or a new version (Revise). Pure logic lives in conversation.ts; this file makes the Claude calls and updates the run.
 */
import { checkChanges } from './guardrails';
import { agent, evaluate, getP, patchRun, preview, step, TOOLS, type AgentDef } from './harness';
import { claude, type Block, type Msg, type ToolDef } from './llm';
import { activeReply, addDelta, canAsk, canRevise, canSend, changedItems, revisableQuotes, demoAnswer, demoRevision, followUpPrompt, mergeChanges, mergeProposal, scanReply, scopeDelta, withAsk, withRevision, type Delta } from './conversation';
import { now, store, uid } from './store';
import type { AgentId, ConvTurn, FileChange, Idea, Quote, Run } from './types';

const REVISE_TOOLS: Partial<Record<AgentId, ToolDef>> = {
  ideation: { name: 'revise_idea', description: 'Save only the idea fields that change.', input_schema: { type: 'object', properties: { intent: { type: 'string' }, problem: { type: 'string' }, users: { type: 'array', items: { type: 'string' } }, outcomeMetric: { type: 'string' }, scopeIn: { type: 'array', items: { type: 'string' } }, scopeOut: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } } } } },
  requirements: { name: 'revise_requirements', description: 'Save only the requirements that change (with their existing id) and new ones (without id). Give full fields for each.', input_schema: { type: 'object', properties: { requirements: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, story: { type: 'string' }, ac: { type: 'array', items: { type: 'string' } }, priority: { type: 'string', enum: ['Must', 'Should', 'Could'] } }, required: ['title', 'story', 'ac', 'priority'] } } }, required: ['requirements'] } },
  designer: { name: 'revise_design', description: 'Save only the screens that change (with their SCR id) and new screens (without id); summary/notes only when they change.', input_schema: { type: 'object', properties: { summary: { type: 'string' }, notes: { type: 'string' }, screens: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, purpose: { type: 'string' }, reqIds: { type: 'array', items: { type: 'string' } }, elements: { type: 'array', items: { type: 'string' } }, states: { type: 'array', items: { type: 'string' } } }, required: ['name', 'purpose', 'reqIds', 'elements', 'states'] } } } } },
  testdesign: { name: 'revise_tests', description: 'Save only the test cases that change (with their TC id) and new ones (without id).', input_schema: { type: 'object', properties: { tests: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, reqIds: { type: 'array', items: { type: 'string' } }, gherkin: { type: 'string' }, type: { type: 'string', enum: ['Automated', 'Manual'] } }, required: ['title', 'reqIds', 'gherkin', 'type'] } } }, required: ['tests'] } },
};

/** The agent answers the reviewer: one call, no tools; the proposal does not change (REQ-051). */
async function liveAsk(a: AgentDef, prompt: string) {
  const r = await claude(store.get().settings, `${a.system}\nYou are now answering the reviewer's follow-up question about your own proposal. Do not call tools.`, [{ role: 'user', content: prompt }], undefined, 1500);
  return { text: r.content.map((b) => (b.type === 'text' ? b.text : '')).join('\n').trim() || '(no answer)', tokens: r.tokens };
}

/**
 * The agent returns only the changed and new items through its revise tool, then finishes (REQ-052). Every tool call is
 * scoped to the quoted items first: anything else is refused in the tool result, so the agent knows it was not saved.
 */
async function liveRevise(pid: string, rid: string, a: AgentDef, run: Run, prompt: string, quotes: Quote[]) {
  const own = a.id === 'coder' ? TOOLS.find((t) => t.name === 'propose_file_change')! : REVISE_TOOLS[a.id];
  if (!own) throw new Error(`${a.name} has nothing to revise.`);
  const tools = [own, TOOLS.find((t) => t.name === 'finish')!];
  const messages: Msg[] = [{ role: 'user', content: prompt }];
  const paths = run.changes.map((c) => c.path);
  let delta: Delta = {};
  let tokens = 0, summary = '';
  for (let turn = 0; turn < 4 && !summary; turn++) {
    const r = await claude(store.get().settings, `${a.system}\nYou are revising your own proposal after the reviewer quoted parts of it. Return only the quoted items that change and new items; keep ids. Anything not quoted is refused.`, messages, tools, 8000);
    tokens += r.tokens;
    step(pid, rid, 'model', `Revision turn ${turn + 1}`, r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n') || '(tool calls only)', { tokens: r.tokens });
    messages.push({ role: 'assistant', content: r.content });
    const uses = r.content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
    if (!uses.length) { summary = r.content.map((b) => (b.type === 'text' ? b.text : '')).join(' ').trim(); break; }
    const results: unknown[] = [];
    for (const u of uses) {
      const i = u.input as Record<string, unknown>;
      let one: Delta | null = null, out = 'Saved.';
      if (u.name === 'finish') summary = String(i.summary || 'Revised.');
      else if (u.name === 'revise_idea') one = { idea: i as Partial<Idea> };
      else if (u.name === 'revise_requirements') one = { requirements: (i.requirements as Delta['requirements']) || [] };
      else if (u.name === 'revise_tests') one = { tests: (i.tests as Delta['tests']) || [] };
      else if (u.name === 'revise_design') one = { design: { summary: i.summary as string | undefined, notes: i.notes as string | undefined, screens: (i.screens as NonNullable<Delta['design']>['screens']) || [] } };
      else if (u.name === 'propose_file_change') {
        const path = String(i.path || '').replace(/^\/+/, '');
        const prev = run.changes.find((c) => c.path === path);
        const g = checkChanges([{ path, action: 'create', content: String(i.content || '') }], getP(pid).spec, undefined, ['REQ-000']).filter((x) => (x.id === 'G1' || x.id === 'G2') && x.level === 'block');
        if (g.length) out = `REJECTED by guardrail: ${g.map((x) => x.message).join('; ')}`;
        else one = { changes: [{ path, action: (i.action as FileChange['action']) || prev?.action || 'create', content: String(i.content || ''), before: prev?.before, reason: String(i.reason || prev?.reason || '') }] };
      } else out = `ERROR: unknown tool ${u.name}`;
      if (one) {
        const s = scopeDelta(one, quotes, paths);
        delta = addDelta(delta, s.delta);
        if (s.dropped.length) out = `${Object.keys(s.delta).length ? 'Saved the quoted items. ' : ''}REJECTED (not quoted by the reviewer, kept unchanged): ${s.dropped.join(', ')}`;
      }
      step(pid, rid, 'tool_call', `${u.name}(${preview(i)})`, out === 'Saved.' ? undefined : out, { ok: !out.includes('REJECTED') });
      results.push({ type: 'tool_result', tool_use_id: u.id, content: out });
    }
    messages.push({ role: 'user', content: results });
  }
  return { delta, text: summary || 'Revised.', tokens };
}

/** Runs this page is waiting on. A stored `replying` without an entry here was interrupted (reload) and is ignored. */
const inFlight = new Set<string>();
export const replyingNow = (r: Pick<Run, 'id' | 'replying'>) => activeReply(r, inFlight);

/**
 * The reviewer quoted parts of a run and asks for details (Ask) or a new version (Revise) — F-020.
 * Quotes and message are data: scanned for prompt injection and wrapped in markers. Nothing is written to the spec or
 * GitHub here; a revision waits for approval again after the guardrails and evals ran on it.
 */
export async function replyToRun(pid: string, rid: string, kind: 'ask' | 'revise', quotes: Quote[], message: string): Promise<string> {
  const p = getP(pid);
  const found = p.runs.find((x) => x.id === rid);
  if (!found) throw new Error('Run not found.');
  const r0 = { ...found, replying: replyingNow(found) };
  const reply = { quotes, message };
  if (!canSend(reply)) throw new Error('Quote something or type a message first.');
  if (kind === 'revise') { const c = canRevise(r0); if (!c.ok) throw new Error(c.why); if (!revisableQuotes(quotes)) throw new Error('Quote inside one requirement, screen, test case, idea field or file to revise it.'); }
  else if (!canAsk(r0)) throw new Error('The agent is still working.');
  const a = agent(r0.agent);
  const live = r0.mode === 'live' && !!store.get().settings.apiKey && !p.demo;
  const you: ConvTurn = { id: uid(), at: now(), who: 'you', kind, quotes, text: message.trim() };
  const g0 = scanReply(reply);
  inFlight.add(rid);
  patchRun(pid, rid, (x) => ({ ...x, replying: kind }));
  step(pid, rid, 'plan', `Reviewer ${kind === 'ask' ? 'asks' : 'asks for a revision'}${quotes.length ? ` · quoted ${quotes.map((q) => q.source).join(', ')}` : ''}`, message.trim() || undefined);
  step(pid, rid, 'guardrail', `${g0.name}: ${g0.level.toUpperCase()}`, g0.message, { ok: g0.level !== 'block' });
  const answer = (text: string, tokens?: number): ConvTurn => ({ id: uid(), at: now(), who: 'agent', text, tokens: tokens || undefined });
  try {
    const prompt = followUpPrompt(r0, kind, reply);
    if (kind === 'ask') {
      const ans = live ? await liveAsk(a, prompt) : { text: demoAnswer(reply), tokens: 0 };
      step(pid, rid, 'model', 'Answered the reviewer', undefined, ans.tokens ? { tokens: ans.tokens } : {});
      patchRun(pid, rid, (x) => withAsk(x, you, answer(ans.text, ans.tokens)));
      return 'The agent answered.';
    }
    const res = live ? await liveRevise(pid, rid, a, r0, prompt, quotes) : { delta: demoRevision(r0, reply), text: `Demo revision of ${quotes.map((q) => q.source).join(', ')}.`, tokens: 0 };
    const cur = getP(pid).runs.find((x) => x.id === rid);
    if (!cur) return 'The run was deleted.';
    const scoped = scopeDelta(res.delta, quotes, cur.changes.map((c) => c.path));
    const taken = [...getP(pid).spec.requirements.map((x) => x.id), ...getP(pid).spec.tests.map((x) => x.id)];
    const revised = { proposal: mergeProposal(cur.proposal, scoped.delta, taken), changes: mergeChanges(cur.changes, scoped.delta.changes) };
    const refused = scoped.dropped.length ? ` Not saved, because they were not quoted: ${scoped.dropped.join(', ')}.` : '';
    if (!changedItems(cur, revised).length) {
      // Nothing quoted could be revised (e.g. only the summary was quoted): no new version, the run keeps its status.
      patchRun(pid, rid, (x) => withAsk(x, you, answer(`No change: nothing in the quoted parts was revised. Quote the requirement, screen, test case, idea field or file to change.${refused}`, res.tokens)));
      return 'Nothing changed — no new version.';
    }
    patchRun(pid, rid, (x) => withRevision(x, you, revised, { id: uid(), at: now(), text: `${res.text}${refused}`, tokens: res.tokens || undefined }));
    await evaluate(pid, rid, a, g0, live);
    const v = getP(pid).runs.find((x) => x.id === rid)!;
    return v.versions?.[v.versions.length - 1]?.summary || 'Revised.';
  } catch (e) {
    step(pid, rid, 'error', 'Follow-up failed', (e as Error).message, { ok: false });
    throw e;
  } finally {
    inFlight.delete(rid);
    patchRun(pid, rid, (x) => ({ ...x, replying: undefined }));
  }
}
