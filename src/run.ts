import { aiArtefact, aiStories } from './ai';
import { byId } from './catalog';
import { GENERATORS, generateStories } from './generators';
import { search, sourcesMarkdown, toSources, tokenize } from './knowledge';
import { store, uid } from './store';
import type { Artefact, Project, SourceRef } from './types';

export const cleanTitle = (t: string) => t.replace(/^(Write|Run|Create|Build|Draft|Define|Map|Plan|Agree|Specify|Compile|Design|Compare|Model|Generate|Prioritise|Start|Derive|Prepare|Collect|Review|Recommend:?)\s+(the\s+)?/i, '').replace(/^./, (m) => m.toUpperCase());

/** Product-wide retrieval for an action: queries all knowledge in the product, not just this initiative. */
export function retrieveFor(p: Project, actionId: string, k = 6): SourceRef[] {
  const st = store.get();
  const prod = st.products.find((x) => x.id === p.productId);
  if (!prod) return [];
  const a = byId(actionId);
  const q = [p.intent, a.title, a.output, a.when, p.features.join(' '), Object.values(p.answers).join(' ')].join(' ');
  const own = p.artefacts.find((x) => x.actionId === actionId);
  return toSources(search(prod, st.projects, q, { k, exclude: (c) => (own ? c.id.startsWith(`art:${own.id}:`) : false) || c.id === `intent:${p.id}` }));
}

/** Fill unanswered clarify questions from retrieved product knowledge (marked with the source key), so templates are grounded. */
function withKnowledgeAnswers(p: Project, src: SourceRef[]): Project {
  const a = { ...p.answers };
  if (!a.pain) {
    const s = src.find((x) => x.kind === 'doc' && /\d/.test(x.snippet)) || src.find((x) => x.kind === 'intent' || x.kind === 'doc');
    if (s) a.pain = `${s.snippet.replace(/^[^:]{0,60}:\s*/, '').slice(0, 220)} [${s.key}, from product knowledge — confirm]`;
  }
  if (!a.metric) {
    const kpis = store.get().products.find((x) => x.id === p.productId)?.profile.kpis || [];
    const it = new Set(tokenize(p.intent));
    const best = kpis.map((k) => ({ k, n: tokenize(k).filter((t) => it.has(t)).length })).sort((x, y) => y.n - x.n)[0];
    if (best && best.n > 0) a.metric = `${best.k} (product KPI — confirm target)`;
  }
  return { ...p, answers: a };
}

/** Runs an action: retrieves product knowledge, generates the artefact (template or Claude) and saves it. Returns where to navigate. */
export async function runAction(p: Project, actionId: string, useAI: boolean): Promise<string> {
  const a = byId(actionId);
  const st = store.get();
  const settings = st.settings;
  const prod = st.products.find((x) => x.id === p.productId);
  if (a.kind === 'navigate') return `/p/${p.id}/${a.target}`;
  const sources = retrieveFor(p, actionId);

  if (a.kind === 'stories') {
    const start = (p.stories.length ? Math.max(...p.stories.map((s) => +s.key.replace('US-', ''))) : 0) + 1;
    const stories = useAI && settings.apiKey ? await aiStories(settings, prod, p, start, sources) : generateStories(p);
    store.updateProject(p.id, (x) => ({ ...x, stories: [...x.stories, ...stories] }));
    return `/p/${p.id}/backlog`;
  }

  const template = GENERATORS[actionId](withKnowledgeAnswers(p, sources));
  let content = template;
  let ai = false;
  if (useAI && settings.apiKey) { content = await aiArtefact(settings, prod, p, actionId, template, sources); ai = true; }
  content = content.replace(/\n## Relevant product knowledge[\s\S]*$/, '') + sourcesMarkdown(sources);
  const now = new Date().toISOString();
  const existing = p.artefacts.find((x) => x.actionId === actionId);
  const art: Artefact = existing
    ? { ...existing, content, updatedAt: now, version: existing.version + 1, status: 'draft', ai, sources }
    : { id: uid(), actionId, title: cleanTitle(a.title), phase: a.phase, content, status: 'draft', createdAt: now, updatedAt: now, version: 1, ai, sources };
  store.updateProject(p.id, (x) => ({ ...x, artefacts: existing ? x.artefacts.map((y) => (y.id === art.id ? art : y)) : [...x.artefacts, art] }));
  return `/p/${p.id}/a/${art.id}`;
}
