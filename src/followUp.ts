/**
 * Follow-ups on an agent run (F-020, REQ-050 … REQ-054): the reviewer quotes parts of the answer and asks for details
 * (Ask) or a new version (Revise). Pure logic lives in conversation.ts; this file makes the Claude calls and updates the run.
 */
import { checkChanges } from './guardrails';
import { agent, evaluate, getP, patchRun, preview, step, TOOLS, type AgentDef } from './harness';
import { claude, type Block, type Msg, type ToolDef } from './llm';
import { canAsk, canRevise, canSend, demoAnswer, demoRevision, followUpPrompt, mergeChanges, mergeProposal, scanReply, withAsk, withRevision, type Delta } from './conversation';
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

/** The agent returns only the changed and new items through its revise tool, then finishes (REQ-052). */
async function liveRevise(pid: string, rid: string, a: AgentDef, run: Run, prompt: string) {
  const own = a.id === 'coder' ? TOOLS.find((t) => t.name === 'propose_file_change')! : REVISE_TOOLS[a.id];
  if (!own) throw new Error(`${a.name} has nothing to revise.`);
  const tools = [own, TOOLS.find((t) => t.name === 'finish')!];
  const messages: Msg[] = [{ role: 'user', content: prompt }];
  const delta: Delta = {};
  let tokens = 0, summary = '';
  for (let turn = 0; turn < 4 && !summary; turn++) {
    const r = await claude(store.get().settings, `${a.system}\nYou are revising your own proposal after the reviewer quoted parts of it. Return only what changes; keep ids.`, messages, tools, 8000);
    tokens += r.tokens;
    step(pid, rid, 'model', `Revision turn ${turn + 1}`, r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n') || '(tool calls only)', { tokens: r.tokens });
    messages.push({ role: 'assistant', content: r.content });
    const uses = r.content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
    if (!uses.length) { summary = r.content.map((b) => (b.type === 'text' ? b.text : '')).join(' ').trim(); break; }
    const results: unknown[] = [];
    for (const u of uses) {
      const i = u.input as Record<string, unknown>;
      let out = 'Saved.';
      if (u.name === 'finish') summary = String(i.summary || 'Revised.');
      else if (u.name === 'revise_idea') delta.idea = { ...delta.idea, ...(i as Partial<Idea>) };
      else if (u.name === 'revise_requirements') delta.requirements = [...(delta.requirements || []), ...((i.requirements as Delta['requirements']) || [])];
      else if (u.name === 'revise_tests') delta.tests = [...(delta.tests || []), ...((i.tests as Delta['tests']) || [])];
      else if (u.name === 'revise_design') delta.design = { summary: i.summary as string | undefined, notes: i.notes as string | undefined, screens: [...(delta.design?.screens || []), ...((i.screens as NonNullable<Delta['design']>['screens']) || [])] };
      else if (u.name === 'propose_file_change') {
        const path = String(i.path || '').replace(/^\/+/, '');
        const prev = run.changes.find((c) => c.path === path);
        const g = checkChanges([{ path, action: 'create', content: String(i.content || '') }], getP(pid).spec, undefined, ['REQ-000']).filter((x) => (x.id === 'G1' || x.id === 'G2') && x.level === 'block');
        if (g.length) out = `REJECTED by guardrail: ${g.map((x) => x.message).join('; ')}`;
        else delta.changes = [...(delta.changes || []).filter((c) => c.path !== path), { path, action: (i.action as FileChange['action']) || prev?.action || 'create', content: String(i.content || ''), before: prev?.before, reason: String(i.reason || prev?.reason || '') }];
      } else out = `ERROR: unknown tool ${u.name}`;
      step(pid, rid, 'tool_call', `${u.name}(${preview(i)})`);
      results.push({ type: 'tool_result', tool_use_id: u.id, content: out });
    }
    messages.push({ role: 'user', content: results });
  }
  return { delta, text: summary || 'Revised.', tokens };
}

/**
 * The reviewer quoted parts of a run and asks for details (Ask) or a new version (Revise) — F-020.
 * Quotes and message are data: scanned for prompt injection and wrapped in markers. Nothing is written to the spec or
 * GitHub here; a revision waits for approval again after the guardrails and evals ran on it.
 */
export async function replyToRun(pid: string, rid: string, kind: 'ask' | 'revise', quotes: Quote[], message: string): Promise<string> {
  const p = getP(pid);
  const r0 = p.runs.find((x) => x.id === rid);
  if (!r0) throw new Error('Run not found.');
  const reply = { quotes, message };
  if (!canSend(reply)) throw new Error('Quote something or type a message first.');
  if (kind === 'revise') { const c = canRevise(r0); if (!c.ok) throw new Error(c.why); if (!quotes.length) throw new Error('Quote what should change first.'); }
  else if (!canAsk(r0)) throw new Error('The agent is still working.');
  const a = agent(r0.agent);
  const live = r0.mode === 'live' && !!store.get().settings.apiKey && !p.demo;
  const you: ConvTurn = { id: uid(), at: now(), who: 'you', kind, quotes, text: message.trim() };
  const g0 = scanReply(reply);
  patchRun(pid, rid, (x) => ({ ...x, replying: kind }));
  step(pid, rid, 'plan', `Reviewer ${kind === 'ask' ? 'asks' : 'asks for a revision'}${quotes.length ? ` · quoted ${quotes.map((q) => q.source).join(', ')}` : ''}`, message.trim() || undefined);
  step(pid, rid, 'guardrail', `${g0.name}: ${g0.level.toUpperCase()}`, g0.message, { ok: g0.level !== 'block' });
  try {
    const prompt = followUpPrompt(r0, kind, reply);
    if (kind === 'ask') {
      const ans = live ? await liveAsk(a, prompt) : { text: demoAnswer(reply), tokens: 0 };
      step(pid, rid, 'model', 'Answered the reviewer', undefined, ans.tokens ? { tokens: ans.tokens } : {});
      patchRun(pid, rid, (x) => ({ ...withAsk(x, you, { id: uid(), at: now(), who: 'agent', text: ans.text, tokens: ans.tokens || undefined }), replying: undefined }));
      return 'The agent answered.';
    }
    const res = live ? await liveRevise(pid, rid, a, r0, prompt) : { delta: demoRevision(r0, reply), text: `Demo revision of ${quotes.map((q) => q.source).join(', ')}.`, tokens: 0 };
    const cur = getP(pid).runs.find((x) => x.id === rid)!;
    const taken = [...getP(pid).spec.requirements.map((x) => x.id), ...getP(pid).spec.tests.map((x) => x.id)];
    const revised = { proposal: mergeProposal(cur.proposal, res.delta, taken), changes: mergeChanges(cur.changes, res.delta.changes) };
    patchRun(pid, rid, (x) => withRevision(x, you, revised, { id: uid(), at: now(), text: res.text, tokens: res.tokens || undefined }));
    await evaluate(pid, rid, a, g0, live);
    const v = getP(pid).runs.find((x) => x.id === rid)!;
    patchRun(pid, rid, (x) => ({ ...x, replying: undefined }));
    return v.versions?.[v.versions.length - 1]?.summary || 'Revised.';
  } catch (e) {
    step(pid, rid, 'error', `Follow-up failed`, (e as Error).message, { ok: false });
    patchRun(pid, rid, (x) => ({ ...x, replying: undefined }));
    throw e;
  }
}
