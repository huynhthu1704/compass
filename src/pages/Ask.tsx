import { useEffect, useState } from 'react';
import { go, query } from '../App';
import { aiAsk } from '../ai';
import { KIND_LABEL, search, toSources } from '../knowledge';
import { useStore } from '../store';
import type { ChunkKind, Product } from '../types';
import { Badge, Button, Markdown, PageHead, toast } from '../ui';

const KIND_TONE: Record<ChunkKind, 'brand' | 'info' | 'accent' | 'neutral' | 'success' | 'warning'> = { doc: 'info', artefact: 'brand', story: 'warning', change: 'success', intent: 'accent', profile: 'neutral' };

export function AskPage({ prod }: { prod: Product }) {
  const { projects, settings } = useStore();
  const [q, setQ] = useState(query().get('q') || '');
  const [asked, setAsked] = useState(query().get('q') || '');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const hits = asked ? search(prod, projects, asked, { k: 10 }) : [];
  const src = toSources(hits);

  useEffect(() => { setAnswer(''); }, [asked]);

  const ask = async () => {
    setBusy(true);
    try { setAnswer(await aiAsk(settings, prod, asked, src)); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="stack gap-xl">
      <PageHead over={`${prod.name} · Ask`} title="Ask your product" sub="Searches every document and every initiative in this product at once — research, specs, analytics, past artefacts, user stories and releases." />
      <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); setAsked(q.trim()); }}>
        <input className="input grow" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What do we know about delivery fees?" />
        <Button type="submit" disabled={!q.trim()}>Search</Button>
      </form>
      {!asked && (
        <div className="row gap-sm wrap">{['Who are our users?', 'Why do customers contact support?', 'What KPIs do we track?', 'What constraints apply to payments?', 'What did we release recently?'].map((x) => <button key={x} className="badge tone-neutral" style={{ border: 0, cursor: 'pointer' }} onClick={() => { setQ(x); setAsked(x); }}>{x}</button>)}</div>
      )}
      {asked && (
        <>
          {settings.apiKey && hits.length > 0 && (
            <div className="card pad-xl stack gap-md">
              {!answer ? <div className="row gap-md"><span className="body-sm t-secondary">Get a synthesised answer with citations to the sources below.</span><Button variant="primary" size="sm" disabled={busy} onClick={ask}>{busy ? 'Thinking…' : '✦ Answer with Claude'}</Button></div> : <><Badge tone="brand">✦ Answer from product knowledge</Badge><Markdown text={answer} /></>}
            </div>
          )}
          <div className="row gap-sm"><h2 className="h3">{hits.length ? `${hits.length} sources` : 'No matches'}</h2><span className="body-sm t-tertiary">across {new Set(hits.map((h) => h.chunk.initiativeId || h.chunk.kind)).size} areas of the product</span></div>
          {!hits.length && <div className="empty">Nothing in this product mentions that yet. Try other words, or upload more knowledge.</div>}
          <div className="stack gap-sm">
            {hits.map((h, i) => (
              <button key={h.chunk.id} className="action-card" onClick={() => h.chunk.route && go(h.chunk.route)}>
                <div className="row gap-sm wrap">
                  <span className="mono-sm t-brand">{src[i].key}</span>
                  <Badge tone={KIND_TONE[h.chunk.kind]}>{KIND_LABEL[h.chunk.kind]}</Badge>
                  {h.chunk.category && <Badge>{h.chunk.category}</Badge>}
                  {h.chunk.initiativeName && <Badge tone="accent">{h.chunk.initiativeName}</Badge>}
                  <span className="label-md">{h.chunk.title}{h.chunk.section ? ` › ${h.chunk.section}` : ''}</span>
                </div>
                <div className="body-sm t-secondary" style={{ whiteSpace: 'pre-line' }}>{h.chunk.text.slice(0, 420)}{h.chunk.text.length > 420 ? '…' : ''}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
