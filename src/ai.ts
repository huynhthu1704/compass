import { byId } from './catalog';
import { ctx } from './generators';
import { uid } from './store';
import type { Product, Profile, Project, Settings, SourceRef, Story } from './types';

const SYSTEM = `You are a senior Business Analyst (CBAP, BABOK v3), Product Owner and Delivery Manager.
You produce practical, realistic artefacts that a real team would use this week. Be specific to the product and project context.
You are given PRODUCT KNOWLEDGE retrieved from the whole product (documents, product profile and other initiatives). Use it, reconcile conflicts, and cite it inline as [K1], [K2] where you rely on it.
Never invent numbers as facts: mark unknown values as _[to confirm]_. Write in clear workplace English. Output GitHub-flavoured Markdown only.`;

export async function callClaude(settings: Settings, user: string, maxTokens = 3000, system = SYSTEM): Promise<string> {
  if (!settings.apiKey) throw new Error('No API key set — add one in Settings');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: settings.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content || []).map((b: { text?: string }) => b.text || '').join('');
}

const knowledgeBlock = (src: SourceRef[]) => (src.length ? `PRODUCT KNOWLEDGE (retrieved across the whole product):\n${src.map((s) => `[${s.key}] ${s.title}: ${s.snippet}`).join('\n')}` : 'PRODUCT KNOWLEDGE: none found.');

function brief(prod: Product | undefined, p: Project) {
  const c = ctx(p);
  const pr = prod?.profile;
  return `PRODUCT: ${prod?.name || '-'} — ${prod?.description || pr?.summary || ''}
Personas: ${pr?.personas.join('; ') || '-'} · Modules: ${pr?.modules.join('; ') || '-'} · Product KPIs: ${pr?.kpis.join('; ') || '-'}
INITIATIVE: ${p.name}
Business intent: ${p.intent}
Domain: ${p.domain} · Type: ${p.productType} · Stage: ${p.stage} · Size: ${p.size}
Affected people: ${c.who.join(', ')}
Pain & evidence: ${p.answers.pain || 'unknown'}
Success metric: ${p.answers.metric || 'unknown'}
Constraints: ${p.answers.constraints || 'unknown'}
Tried before: ${p.answers.tried || 'unknown'}
Capabilities in mind: ${c.features.join('; ')}
Artefacts already produced in this initiative: ${p.artefacts.map((a) => a.title).join('; ') || 'none'}`;
}

export async function aiArtefact(settings: Settings, prod: Product | undefined, p: Project, actionId: string, template: string, src: SourceRef[]) {
  const a = byId(actionId);
  return callClaude(settings, `${brief(prod, p)}

${knowledgeBlock(src)}

TASK: Produce the artefact "${a.title}" (${a.babok}). Expected output: ${a.output}.
Use this template as the structure, but replace generic placeholders with content specific to this product and initiative, using the product knowledge where relevant (cite [Kn]). Keep tables. Keep the first quote line. End with "Assumptions" and "Open questions" sections. Do not include a "Relevant product knowledge" section — it is added automatically.

TEMPLATE:
${template.replace(/\n## Relevant product knowledge[\s\S]*$/, '')}`);
}

export async function aiStories(settings: Settings, prod: Product | undefined, p: Project, startAt: number, src: SourceRef[]): Promise<Story[]> {
  const text = await callClaude(settings, `${brief(prod, p)}

${knowledgeBlock(src)}

TASK: Write detailed user stories for the MVP (INVEST), consistent with the existing product modules and personas. Return ONLY a JSON array, no prose, no code fence. Each item:
{"epic": string, "title": string, "asA": string, "iWant": string (starts with "to "), "soThat": string, "ac": string[] (2-4 Gherkin scenarios, each "Given ...\\nWhen ...\\nThen ..."), "priority": "Must"|"Should"|"Could", "points": 1|2|3|5|8, "events": string[] (snake_case analytics events)}
Write 6-12 stories, grouped into epics by capability. Include one story for usage measurement.`, 4000);
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  const arr = JSON.parse(json) as Omit<Story, 'id' | 'key' | 'status' | 'feature'>[];
  return arr.map((s, i) => ({ ...s, id: uid(), key: `US-${startAt + i}`, status: 'To do', feature: s.epic, ac: s.ac || [], events: s.events || [] }));
}

export async function aiProfile(settings: Settings, prod: Product): Promise<Profile> {
  const corpus = prod.docs.map((d) => `### ${d.title} (${d.category})\n${d.content}`).join('\n\n').slice(0, 120000);
  const text = await callClaude(settings, `PRODUCT: ${prod.name} — ${prod.description}\n\nKNOWLEDGE BASE:\n${corpus}\n\nTASK: Build a product profile from this knowledge base. Return ONLY JSON, no code fence:
{"summary": string (3-4 sentences), "personas": string[], "modules": string[] (existing modules / capabilities), "kpis": string[] (with current values if known), "constraints": string[], "glossary": [{"term": string, "def": string}]}`, 3000, 'You are a senior Business Analyst. Extract facts only from the provided knowledge base. Do not invent.');
  const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  return { summary: j.summary || '', personas: j.personas || [], modules: j.modules || [], kpis: j.kpis || [], constraints: j.constraints || [], glossary: j.glossary || [], builtAt: new Date().toISOString(), ai: true };
}

export async function aiAsk(settings: Settings, prod: Product, question: string, src: SourceRef[]) {
  return callClaude(settings, `PRODUCT: ${prod.name} — ${prod.description || prod.profile.summary}\n\n${knowledgeBlock(src)}\n\nQUESTION: ${question}\n\nAnswer concisely from the product knowledge only, citing [Kn] for every claim. If the knowledge does not answer it, say what is missing and which BA action would find out.`, 1500);
}
