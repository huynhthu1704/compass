import { useState } from 'react';
import { loadRepoDocs, rag } from '../rag';
import { useStore } from '../store';
import type { Project } from '../types';
import { Badge, Button, PageHead, useAction } from '../ui';

export function KnowledgePage({ p }: { p: Project }) {
  const { settings } = useStore();
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState('');
  const [, force] = useState(0);
  const [prog, setProg] = useState('');
  const { busy, run } = useAction();
  const index = rag.index(p);
  const hits = asked ? index.search(asked, 10) : [];
  const files = rag.repoDocs(p.id);

  const reindex = () => run(async () => {
    const docs = await loadRepoDocs(settings.githubToken!, p, (n, t) => setProg(`${n}/${t}`));
    rag.setRepoDocs(p.id, docs); setProg(''); force((x) => x + 1);
    return `Indexed ${docs.length} files`;
  });

  return (
    <div className="stack gap-xl">
      <PageHead over="RAG layer" title="Project knowledge" sub="What the agents can retrieve: repository files (code & docs) plus the spec. Retrieval is BM25 in your browser; every agent run logs which chunks it used."
        right={settings.githubToken && p.repo && !p.demo ? <Button variant="secondary" disabled={busy} onClick={reindex}>{busy ? `Indexing ${prog}` : 'Re-index repository'}</Button> : undefined} />
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <div className="card kpi"><span className="label-sm t-tertiary">Repository files</span><span className="v">{files.length}</span></div>
        <div className="card kpi"><span className="label-sm t-tertiary">Spec items</span><span className="v">{1 + p.spec.requirements.length + p.spec.tests.length}</span></div>
        <div className="card kpi"><span className="label-sm t-tertiary">Searchable chunks</span><span className="v">{index.chunks.length}</span></div>
        <div className="card kpi"><span className="label-sm t-tertiary">Indexed</span><span className="v" style={{ fontSize: 14 }}>{rag.indexedAt(p.id)?.slice(0, 16).replace('T', ' ') || (p.repo ? 'not yet' : '—')}</span></div>
      </div>
      <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); setAsked(q); }}>
        <input className="input grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search like an agent would — e.g. 'share trip private link'" />
        <Button type="submit" disabled={!q.trim()}>Retrieve</Button>
      </form>
      {asked && (hits.length ? hits.map((h, i) => (
        <div key={h.chunk.id} className="card stack gap-xs">
          <div className="row gap-sm wrap"><span className="mono-sm t-brand">S{i + 1}</span><Badge tone={h.chunk.kind === 'code' ? 'info' : h.chunk.kind === 'spec' ? 'brand' : 'neutral'}>{h.chunk.kind}</Badge><span className="mono" style={{ fontSize: 12 }}>{h.chunk.path}</span>{h.chunk.section && <span className="body-sm t-tertiary">› {h.chunk.section}</span>}<span className="grow" /><span className="mono-sm t-tertiary">score {h.score.toFixed(2)}</span></div>
          <pre className="diff" style={{ maxHeight: 180 }}>{h.chunk.text.slice(0, 900)}</pre>
        </div>
      )) : <div className="empty">No matching chunks.</div>)}
      {!asked && files.length > 0 && <details className="card"><summary className="label-md" style={{ cursor: 'pointer' }}>Indexed files ({files.length})</summary><div className="mono-sm t-secondary" style={{ columns: 2, marginTop: 8 }}>{files.map((f) => <div key={f.path}>{f.path}</div>)}</div></details>}
    </div>
  );
}
