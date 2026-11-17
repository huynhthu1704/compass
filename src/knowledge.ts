/**
 * Product knowledge engine.
 * Everything a product knows becomes searchable chunks: uploaded documents, the product profile,
 * and — across ALL initiatives in the product — business intents, artefacts, user stories and change logs.
 * Retrieval is BM25 over those chunks, so generation in one initiative can use knowledge from any other.
 */
import type { ChunkKind, DocCategory, KDoc, Product, Profile, Project, SourceRef } from './types';

export interface Chunk {
  id: string;
  kind: ChunkKind;
  title: string;        // source title
  section: string;      // heading inside the source
  text: string;
  route?: string;
  initiativeId?: string;
  initiativeName?: string;
  category?: string;
}

// ---------------- file ingestion ----------------
export const ACCEPT = '.md,.markdown,.txt,.csv,.tsv,.json,.html,.htm,.docx,.pdf';

function htmlToText(html: string) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  d.querySelectorAll('script,style').forEach((n) => n.remove());
  d.querySelectorAll('h1,h2,h3,h4').forEach((h) => { h.textContent = `\n## ${h.textContent}\n`; });
  d.querySelectorAll('p,li,tr,br,div').forEach((n) => n.append('\n'));
  d.querySelectorAll('li').forEach((n) => n.prepend('- '));
  return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

export async function readFileText(f: File): Promise<string> {
  const ext = f.name.toLowerCase().split('.').pop() || '';
  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const r = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
    return htmlToText(r.value);
  }
  if (ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      pages.push(`## Page ${i}\n` + tc.items.map((it) => ('str' in it ? it.str : '')).join(' '));
    }
    return pages.join('\n\n');
  }
  const text = await f.text();
  if (ext === 'html' || ext === 'htm') {
    return htmlToText(text);
  }
  if (ext === 'json') {
    try { return '```\n' + JSON.stringify(JSON.parse(text), null, 2).slice(0, 200000) + '\n```'; } catch { return text; }
  }
  return text;
}

export function guessCategory(name: string, text: string): DocCategory {
  const s = (name + ' ' + text.slice(0, 3000)).toLowerCase();
  const rules: [RegExp, DocCategory][] = [
    [/glossary|definition|thuật ngữ/, 'Glossary'],
    [/interview|persona|user research|survey|usability|pain point/, 'User research'],
    [/ticket|complaint|feedback|nps|csat|support/, 'Support & feedback'],
    [/kpi|metric|conversion|retention|dashboard|analytics|funnel|dau|mau/, 'Analytics & KPIs'],
    [/release note|changelog|version \d/, 'Release notes'],
    [/api|architecture|database|endpoint|integration|schema|microservice/, 'Technical / architecture'],
    [/sop|procedure|process|workflow|step \d/, 'Process / SOP'],
    [/prd|requirement|user story|acceptance criteria|feature|epic/, 'Product spec / PRD'],
    [/strategy|okr|vision|market|competitor|roadmap/, 'Business strategy'],
  ];
  return rules.find(([r]) => r.test(s))?.[1] || 'Other';
}

// ---------------- chunking ----------------
function splitMarkdown(text: string, max = 900): { section: string; text: string }[] {
  const out: { section: string; text: string }[] = [];
  let section = '';
  let buf: string[] = [];
  const flush = () => {
    const t = buf.join('\n').trim();
    if (t) {
      // split very long sections by paragraphs
      if (t.length <= max) out.push({ section, text: t });
      else {
        let cur = '';
        for (const para of t.split(/\n\s*\n/)) {
          if ((cur + '\n\n' + para).length > max && cur) { out.push({ section, text: cur.trim() }); cur = ''; }
          cur += (cur ? '\n\n' : '') + para;
          while (cur.length > max * 1.5) { out.push({ section, text: cur.slice(0, max) }); cur = cur.slice(max); }
        }
        if (cur.trim()) out.push({ section, text: cur.trim() });
      }
    }
    buf = [];
  };
  for (const line of text.split('\n')) {
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) { flush(); section = h[1].trim(); continue; }
    buf.push(line);
  }
  flush();
  return out;
}

export function buildChunks(product: Product, projects: Project[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const d of product.docs) {
    splitMarkdown(d.content).forEach((c, i) => chunks.push({ id: `doc:${d.id}:${i}`, kind: 'doc', title: d.title, section: c.section, text: c.text, category: d.category, route: `/prod/${product.id}/knowledge?doc=${d.id}` }));
  }
  const pr = product.profile;
  const profText = [pr.summary && `Summary: ${pr.summary}`, pr.personas.length && `Personas / users: ${pr.personas.join('; ')}`, pr.modules.length && `Modules / capabilities: ${pr.modules.join('; ')}`, pr.kpis.length && `KPIs: ${pr.kpis.join('; ')}`, pr.constraints.length && `Constraints: ${pr.constraints.join('; ')}`, pr.glossary.length && `Glossary: ${pr.glossary.map((g) => `${g.term} = ${g.def}`).join('; ')}`].filter(Boolean).join('\n');
  if (profText) chunks.push({ id: `profile:${product.id}`, kind: 'profile', title: `${product.name} — product profile`, section: 'Profile', text: profText, route: `/prod/${product.id}/knowledge` });

  for (const p of projects.filter((x) => x.productId === product.id)) {
    const base = { initiativeId: p.id, initiativeName: p.name };
    const ans = p.answers;
    chunks.push({ ...base, id: `intent:${p.id}`, kind: 'intent', title: `Initiative: ${p.name}`, section: 'Business intent', route: `/p/${p.id}`,
      text: [`Business intent: ${p.intent}`, ans.affected && `Affected: ${ans.affected}`, ans.pain && `Pain & evidence: ${ans.pain}`, ans.metric && `Success metric: ${ans.metric}`, ans.constraints && `Constraints: ${ans.constraints}`, ans.tried && `Tried before: ${ans.tried}`, p.features.length && `Capabilities: ${p.features.join('; ')}`].filter(Boolean).join('\n') });
    for (const a of p.artefacts) {
      splitMarkdown(a.content.replace(/^> .*\n/, '').replace(/## Relevant product knowledge[\s\S]*$/, '')).forEach((c, i) => chunks.push({ ...base, id: `art:${a.id}:${i}`, kind: 'artefact', title: a.title, section: c.section, text: c.text, route: `/p/${p.id}/a/${a.id}` }));
    }
    for (const s of p.stories) {
      chunks.push({ ...base, id: `story:${s.id}`, kind: 'story', title: `${s.key} ${s.title}`, section: s.epic, route: `/p/${p.id}/backlog`,
        text: `As a ${s.asA}, I want ${s.iWant}, so that ${s.soThat}. Priority ${s.priority}, ${s.points} pts, ${s.status}.\n${s.ac.join('\n')}\nEvents: ${s.events.join(', ')}` });
    }
    if (p.changelog.length) {
      chunks.push({ ...base, id: `change:${p.id}`, kind: 'change', title: `Change log — ${p.name}`, section: 'Releases & changes', route: `/p/${p.id}/release`,
        text: p.changelog.map((c) => `${c.date} ${c.type}: ${c.title} (${c.rollout}% rollout)`).join('\n') });
    }
  }
  return chunks;
}

// ---------------- BM25 search ----------------
const STOP = new Set('a an the and or of to in on for with by at from is are was were be been this that these those it its as we our you your i they their he she not no but if then than so such into over under about can will shall should would may might must do does did have has had all any each more most other some only own same very just also via per vs etc và của cho các những được là có trong với không một này đó để khi thì'.split(' '));

export function tokenize(s: string): string[] {
  return s.toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, '') : t));
}

interface Index { chunks: Chunk[]; tf: Map<string, number>[]; len: number[]; df: Map<string, number>; avg: number }
const cache = new Map<string, { sig: string; index: Index }>();

function getIndex(product: Product, projects: Project[]): Index {
  const mine = projects.filter((p) => p.productId === product.id);
  const sig = product.updatedAt + '|' + product.docs.length + '|' + mine.map((p) => p.updatedAt).join(',');
  const hit = cache.get(product.id);
  if (hit && hit.sig === sig) return hit.index;
  const chunks = buildChunks(product, projects);
  const tf: Map<string, number>[] = [], len: number[] = [], df = new Map<string, number>();
  for (const c of chunks) {
    const toks = tokenize(`${c.title} ${c.section} ${c.section} ${c.text}`);
    const m = new Map<string, number>();
    toks.forEach((t) => m.set(t, (m.get(t) || 0) + 1));
    m.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
    tf.push(m); len.push(toks.length);
  }
  const index = { chunks, tf, len, df, avg: len.reduce((a, b) => a + b, 0) / Math.max(1, len.length) };
  cache.set(product.id, { sig, index });
  return index;
}

export interface Hit { chunk: Chunk; score: number }

export function search(product: Product, projects: Project[], query: string, opts: { k?: number; exclude?: (c: Chunk) => boolean; kinds?: ChunkKind[] } = {}): Hit[] {
  const ix = getIndex(product, projects);
  const q = [...new Set(tokenize(query))];
  if (!q.length) return [];
  const N = ix.chunks.length, k1 = 1.4, b = 0.75;
  const hits: Hit[] = [];
  ix.chunks.forEach((c, i) => {
    if (opts.exclude?.(c) || (opts.kinds && !opts.kinds.includes(c.kind))) return;
    let s = 0;
    for (const t of q) {
      const f = ix.tf[i].get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - (ix.df.get(t) || 0) + 0.5) / ((ix.df.get(t) || 0) + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * ix.len[i]) / ix.avg)));
    }
    if (s > 0) hits.push({ chunk: c, score: s });
  });
  hits.sort((a, b2) => b2.score - a.score);
  // diversity: at most 2 chunks from the same source
  const per = new Map<string, number>();
  const out: Hit[] = [];
  for (const h of hits) {
    const src = h.chunk.id.split(':').slice(0, 2).join(':');
    if ((per.get(src) || 0) >= (h.chunk.kind === 'doc' ? 2 : 1)) continue;
    per.set(src, (per.get(src) || 0) + 1);
    out.push(h);
    if (out.length >= (opts.k || 8)) break;
  }
  return out;
}

export function knowledgeStats(product: Product, projects: Project[]) {
  const ix = getIndex(product, projects);
  const by = (k: ChunkKind) => ix.chunks.filter((c) => c.kind === k).length;
  return { chunks: ix.chunks.length, docs: product.docs.length, artefactChunks: by('artefact'), stories: by('story'), initiatives: by('intent') };
}

export const KIND_LABEL: Record<ChunkKind, string> = { doc: 'Document', artefact: 'Artefact', story: 'User story', change: 'Change log', intent: 'Initiative', profile: 'Product profile' };

export function toSources(hits: Hit[]): SourceRef[] {
  return hits.map((h, i) => ({
    key: `K${i + 1}`, chunkId: h.chunk.id, kind: h.chunk.kind,
    title: h.chunk.initiativeName && h.chunk.kind !== 'intent' ? `${h.chunk.title} (${h.chunk.initiativeName})` : h.chunk.title,
    snippet: (h.chunk.section ? `${h.chunk.section}: ` : '') + h.chunk.text.replace(/\s+/g, ' ').slice(0, 280),
    route: h.chunk.route,
  }));
}

export function sourcesMarkdown(src: SourceRef[]) {
  if (!src.length) return '';
  return `\n## Relevant product knowledge\n_Compass searched the whole product (documents, profile and every initiative) and found:_\n\n${src.map((s) => `- **[${s.key}] ${s.title}** — ${s.snippet}${s.snippet.length >= 280 ? '…' : ''}`).join('\n')}\n`;
}

// ---------------- product profile (heuristic) ----------------
const uniq = (a: string[], n: number) => [...new Map(a.map((x) => [x.toLowerCase().trim(), x.trim()])).values()].filter((x) => x.length > 2 && x.length < 140).slice(0, n);

export function extractProfile(product: Product): Profile {
  const docs = product.docs;
  const all = docs.map((d) => d.content).join('\n');
  const lines = all.split('\n').map((l) => l.replace(/^[\s>*\-•\d.)|]+/, '').replace(/\*\*/g, '').trim()).filter(Boolean);

  const personas: string[] = [];
  for (const l of lines) {
    const m = l.match(/^(?:primary |secondary )?(?:persona|user|users|customer|customers|segment|role|actor)s?\s*[:\-–]\s*(.+)$/i);
    if (m) personas.push(...m[1].split(/[,;]/));
    const st = l.match(/\bAs an? ([A-Za-z][\w\s-]{2,40}?),\s*I want/i);
    if (st) personas.push(st[1]);
  }
  const modules: string[] = [];
  for (const d of docs.filter((d) => /PRD|Technical|Process|Release/.test(d.category))) {
    for (const m of d.content.matchAll(/^#{2,3}\s+(.+)$/gm)) if (!/^(overview|introduction|summary|appendix|table of contents|page \d+|personas?|users?|services|constraints?|architecture|key findings|findings|quotes|kpis?|glossary|background|goals?|scope|risks?|open questions|assumptions)$/i.test(m[1].trim())) modules.push(m[1]);
  }
  for (const l of lines) { const m = l.match(/^(?:module|feature|capability|epic)s?\s*[:\-–]\s*(.+)$/i); if (m) modules.push(...m[1].split(/[,;]/)); }
  const kpis = lines.filter((l) => /\b(kpi|conversion|retention|rate|nps|csat|dau|mau|churn|aov|revenue|completion|abandonment|time)\b/i.test(l) && /[:=–—]\s*[\d.,]+\s*(%|vnd|days?|s|ms|k|m)?\b|\d+(\.\d+)?%/i.test(l) && l.length < 110 && !/\b(uses|search by|browse)\b/i.test(l));
  const constraints = lines.filter((l) => /\b(must|regulat|complian|gdpr|pci|deadline|budget|legal|policy|sla|security)\b/i.test(l) && l.length < 160);
  const glossary: { term: string; def: string }[] = [];
  for (const d of docs) {
    const isG = d.category === 'Glossary';
    for (const raw of d.content.split('\n')) {
      const l = raw.replace(/^[\s*\-•|]+/, '').replace(/\*\*/g, '');
      const m = l.match(/^([A-Z][\w ./&-]{1,40}?)\s*(?:[:=–—]|\|)\s*(.{8,200})$/);
      if (m && (isG || /\b(is|means|refers|=)\b/i.test(m[2]))) glossary.push({ term: m[1].trim(), def: m[2].replace(/\|$/, '').trim() });
    }
  }
  const firstPara = docs.map((d) => d.content.split(/\n\s*\n/).find((p) => p.trim().length > 80 && !p.trim().startsWith('#') && !p.includes('|')) || '').find(Boolean) || '';
  return {
    summary: product.description || firstPara.replace(/\s+/g, ' ').slice(0, 400),
    personas: uniq(personas, 8), modules: uniq(modules, 12), kpis: uniq(kpis, 8), constraints: uniq(constraints, 8),
    glossary: [...new Map(glossary.map((g) => [g.term.toLowerCase(), g])).values()].slice(0, 30),
    builtAt: new Date().toISOString(), ai: false,
  };
}

export function newDoc(title: string, content: string, fileName?: string, category?: DocCategory): KDoc {
  return { id: Math.random().toString(36).slice(2, 10), title, content, fileName, category: category || guessCategory(fileName || title, content), addedAt: new Date().toISOString() };
}
