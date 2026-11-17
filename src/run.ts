import { aiArtefact, aiStories } from './ai';
import { byId } from './catalog';
import { GENERATORS, generateStories } from './generators';
import { store, uid } from './store';
import type { Artefact, Project } from './types';

/** Runs an action: generates the artefact (template, optionally AI-enhanced) and saves it. Returns where to navigate. */
export async function runAction(p: Project, actionId: string, useAI: boolean): Promise<string> {
  const a = byId(actionId);
  const settings = store.get().settings;
  if (a.kind === 'navigate') return `/p/${p.id}/${a.target}`;

  if (a.kind === 'stories') {
    const start = (p.stories.length ? Math.max(...p.stories.map((s) => +s.key.replace('US-', ''))) : 0) + 1;
    const stories = useAI && settings.apiKey ? await aiStories(settings, p, start) : generateStories(p);
    store.updateProject(p.id, (x) => ({ ...x, stories: [...x.stories, ...stories] }));
    return `/p/${p.id}/backlog`;
  }

  const template = GENERATORS[actionId](p);
  let content = template;
  let ai = false;
  if (useAI && settings.apiKey) { content = await aiArtefact(settings, p, actionId, template); ai = true; }
  const now = new Date().toISOString();
  const existing = p.artefacts.find((x) => x.actionId === actionId);
  const art: Artefact = existing
    ? { ...existing, content, updatedAt: now, version: existing.version + 1, status: 'draft', ai }
    : { id: uid(), actionId, title: a.title.replace(/^(Write|Run|Create|Build|Draft|Define|Map|Plan|Agree|Specify|Compile|Design|Compare|Model|Generate|Prioritise|Start|Derive|Prepare|Collect|Review|Recommend:?)\s+(the\s+)?/i, '').replace(/^./, (m) => m.toUpperCase()), phase: a.phase, content, status: 'draft', createdAt: now, updatedAt: now, version: 1, ai };
  store.updateProject(p.id, (x) => ({ ...x, artefacts: existing ? x.artefacts.map((y) => (y.id === art.id ? art : y)) : [...x.artefacts, art] }));
  return `/p/${p.id}/a/${art.id}`;
}
