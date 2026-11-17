import { byId } from './catalog';
import { ctx } from './generators';
import { uid } from './store';
import type { Project, Settings, Story } from './types';

const SYSTEM = `You are a senior Business Analyst (CBAP, BABOK v3), Product Owner and Delivery Manager.
You produce practical, realistic artefacts that a real team would use this week. Be specific to the project context.
Never invent numbers as facts: mark unknown values as _[to confirm]_. Write in clear workplace English. Output GitHub-flavoured Markdown only.`;

async function call(settings: Settings, user: string, maxTokens = 3000): Promise<string> {
  if (!settings.apiKey) throw new Error('No API key set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: settings.model, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content || []).map((b: { text?: string }) => b.text || '').join('');
}

function projectBrief(p: Project) {
  const c = ctx(p);
  const done = p.artefacts.map((a) => `- ${a.title}`).join('\n') || '- none';
  return `PROJECT: ${p.name}
Business intent: ${p.intent}
Domain: ${p.domain} · Type: ${p.productType} · Stage: ${p.stage} · Size: ${p.size}
Affected people: ${c.who.join(', ')}
Pain & evidence: ${p.answers.pain || 'unknown'}
Success metric: ${p.answers.metric || 'unknown'}
Constraints: ${p.answers.constraints || 'unknown'}
Tried before: ${p.answers.tried || 'unknown'}
Capabilities in mind: ${c.features.join('; ')}
Artefacts already produced:\n${done}`;
}

export async function aiArtefact(settings: Settings, p: Project, actionId: string, template: string) {
  const a = byId(actionId);
  const prompt = `${projectBrief(p)}

TASK: Produce the artefact "${a.title}" (${a.babok}). Expected output: ${a.output}.
Use this template as the structure, but replace generic placeholders with content specific to this project. Keep tables. Keep the first quote line. End with "Assumptions" and "Open questions" sections.

TEMPLATE:
${template}`;
  return call(settings, prompt);
}

export async function aiStories(settings: Settings, p: Project, startAt: number): Promise<Story[]> {
  const prompt = `${projectBrief(p)}

TASK: Write detailed user stories for the MVP (INVEST). Return ONLY a JSON array, no prose, no code fence. Each item:
{"epic": string, "title": string, "asA": string, "iWant": string (starts with "to "), "soThat": string, "ac": string[] (2-4 Gherkin scenarios, each "Given ...\\nWhen ...\\nThen ..."), "priority": "Must"|"Should"|"Could", "points": 1|2|3|5|8, "events": string[] (snake_case analytics events)}
Write 6-12 stories, grouped into epics by capability. Include one story for usage measurement.`;
  const text = await call(settings, prompt, 4000);
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  const arr = JSON.parse(json) as Omit<Story, 'id' | 'key' | 'status' | 'feature'>[];
  return arr.map((s, i) => ({ ...s, id: uid(), key: `US-${startAt + i}`, status: 'To do', feature: s.epic, ac: s.ac || [], events: s.events || [] }));
}
