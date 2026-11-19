/**
 * RAG layer: indexes a project's repository files + its spec, and retrieves
 * the most relevant chunks for any agent step (BM25, runs in the browser).
 */
import { DEMO_FILES } from './demofiles';
import { github } from './github';
import type { Project } from './types';

export interface Doc { path: string; content: string }
export interface Chunk { id: string; path: string; section: string; text: string; kind: 'code' | 'doc' | 'spec' }
export interface Hit { chunk: Chunk; score: number }

const TEXT = /\.(md|mdx|txt|json|ya?ml|html?|css|scss|js|jsx|mjs|cjs|ts|tsx|vue|svelte|py|go|rb|java|kt|cs|php|sql|toml|sh)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|\.next|coverage|vendor)\/|package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$|\.min\.(js|css)$/;

// ---------- loading ----------
export async function loadRepoDocs(token: string, p: Project, onProgress?: (n: number, total: number) => void): Promise<Doc[]> {
  if (!p.repo) return [];
  const tree = (await github.tree(token, p.repo)).filter((f) => TEXT.test(f.path) && !SKIP.test(f.path) && (f.size || 0) < 80_000);
  const pick = tree.sort((a, b) => score(a.path) - score(b.path)).slice(0, 150);
  const docs: Doc[] = [];
  let i = 0;
  const worker = async () => {
    while (i < pick.length) {
      const f = pick[i++];
      const file = await github.file(token, p.repo!, f.path).catch(() => null);
      if (file) docs.push({ path: f.path, content: file.content });
      onProgress?.(docs.length, pick.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return docs;
}
// prefer docs & source over config
const score = (p: string) => (/^(AGENTS|CLAUDE|README)\.md$/i.test(p) ? 0 : p.startsWith('compass/') ? 1 : /^src\//.test(p) ? 2 : /\.md$/.test(p) ? 3 : 4);

export function specDocs(p: Project): Doc[] {
  const s = p.spec;
  const docs: Doc[] = [{ path: 'spec:idea', content: `# Idea\nIntent: ${s.idea.intent}\nProblem: ${s.idea.problem}\nUsers: ${s.idea.users.join(', ')}\nOutcome metric: ${s.idea.outcomeMetric}\nIn scope: ${s.idea.scopeIn.join('; ')}\nOut of scope: ${s.idea.scopeOut.join('; ')}\nRisks: ${s.idea.risks.join('; ')}\nStack: ${s.idea.stack}` }];
  for (const r of s.requirements) docs.push({ path: `spec:${r.id}`, content: `# ${r.id} ${r.title}\n${r.story}\nPriority ${r.priority}, status ${r.status}\n${r.ac.join('\n')}` });
  for (const t of s.tests) docs.push({ path: `spec:${t.id}`, content: `# ${t.id} ${t.title}\nCovers ${t.reqIds.join(', ')} · ${t.type} · ${t.status}\n${t.gherkin}` });
  return docs;
}

// ---------- chunking ----------
function chunk(d: Doc): Chunk[] {
  const out: Chunk[] = [];
  const kind: Chunk['kind'] = d.path.startsWith('spec:') ? 'spec' : /\.(md|mdx|txt)$/i.test(d.path) ? 'doc' : 'code';
  if (kind !== 'code') {
    let section = '', buf: string[] = [];
    const flush = () => { const t = buf.join('\n').trim(); if (t) for (let i = 0; i < t.length; i += 1200) out.push({ id: `${d.path}#${out.length}`, path: d.path, section, text: t.slice(i, i + 1200), kind }); buf = []; };
    for (const line of d.content.split('\n')) { const h = line.match(/^#{1,4}\s+(.*)/); if (h) { flush(); section = h[1]; } buf.push(line); }
    flush();
  } else {
    const lines = d.content.split('\n');
    for (let i = 0; i < lines.length; i += 50) out.push({ id: `${d.path}#L${i + 1}`, path: d.path, section: `L${i + 1}-${Math.min(i + 60, lines.length)}`, text: lines.slice(i, i + 60).join('\n'), kind });
  }
  return out;
}

// ---------- BM25 ----------
const STOP = new Set('a an the and or of to in on for with by at from is are was were be this that it as we you i they not but if then so into can will should do does have has all any each more also và của cho các những được là có trong với không một này để khi const let var return import export function from true false null undefined new class'.split(' '));
export const tokenize = (s: string) => s.toLowerCase().normalize('NFC').replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1 && !STOP.has(t)).map((t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, '') : t));

export class Index {
  chunks: Chunk[]; tf: Map<string, number>[] = []; len: number[] = []; df = new Map<string, number>(); avg = 1;
  files: string[];
  constructor(docs: Doc[]) {
    this.files = docs.map((d) => d.path);
    this.chunks = docs.flatMap(chunk);
    for (const c of this.chunks) {
      const toks = tokenize(`${c.path.replace(/[/._-]/g, ' ')} ${c.section} ${c.text}`);
      const m = new Map<string, number>();
      toks.forEach((t) => m.set(t, (m.get(t) || 0) + 1));
      m.forEach((_, t) => this.df.set(t, (this.df.get(t) || 0) + 1));
      this.tf.push(m); this.len.push(toks.length);
    }
    this.avg = this.len.reduce((a, b) => a + b, 0) / Math.max(1, this.len.length);
  }
  search(q: string, k = 6, filter?: (c: Chunk) => boolean): Hit[] {
    const qt = [...new Set(tokenize(q))];
    const N = this.chunks.length, k1 = 1.4, b = 0.75;
    const hits: Hit[] = [];
    this.chunks.forEach((c, i) => {
      if (filter && !filter(c)) return;
      let s = 0;
      for (const t of qt) { const f = this.tf[i].get(t); if (!f) continue; const df = this.df.get(t) || 0; s += Math.log(1 + (N - df + 0.5) / (df + 0.5)) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * this.len[i]) / this.avg))); }
      if (s > 0) hits.push({ chunk: c, score: s });
    });
    hits.sort((x, y) => y.score - x.score);
    const per = new Map<string, number>(), out: Hit[] = [];
    for (const h of hits) { const n = per.get(h.chunk.path) || 0; if (n >= 2) continue; per.set(h.chunk.path, n + 1); out.push(h); if (out.length >= k) break; }
    return out;
  }
}

// cache: project id → { repo docs, index }
const cache = new Map<string, { docs: Doc[]; at: string }>();
export const rag = {
  setRepoDocs(id: string, docs: Doc[]) { cache.set(id, { docs, at: new Date().toISOString() }); },
  repoDocs: (id: string) => cache.get(id)?.docs || [],
  demoFallback(p: Project) { if (p.demo && !cache.has(p.id)) rag.setRepoDocs(p.id, DEMO_FILES); },
  indexedAt: (id: string) => cache.get(id)?.at,
  index(p: Project) { rag.demoFallback(p); return new Index([...specDocs(p), ...rag.repoDocs(p.id)]); },
  async ensure(token: string | undefined, p: Project) {
    if (!cache.has(p.id) && token && p.repo) rag.setRepoDocs(p.id, await loadRepoDocs(token, p));
    return rag.index(p);
  },
};

export const fmtHits = (hits: Hit[]) => hits.map((h, i) => `[S${i + 1}] ${h.chunk.path}${h.chunk.section ? ` › ${h.chunk.section}` : ''}\n${h.chunk.text.slice(0, 1500)}`).join('\n\n---\n\n');
