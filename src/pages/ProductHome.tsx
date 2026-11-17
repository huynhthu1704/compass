import { useState } from 'react';
import { go } from '../App';
import { alertState, currentPhase, phaseProgress } from '../engine';
import { knowledgeStats } from '../knowledge';
import { useT } from '../i18n';
import { useStore } from '../store';
import { PHASES, type Product } from '../types';
import { Badge, Button, PageHead, PhaseChip } from '../ui';

export function ProductHome({ prod }: { prod: Product }) {
  const t = useT();
  const { projects } = useStore();
  const inits = projects.filter((p) => p.productId === prod.id);
  const stats = knowledgeStats(prod, projects);
  const [q, setQ] = useState('');
  const changes = inits.flatMap((p) => p.changelog.map((c) => ({ ...c, init: p }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const pr = prod.profile;

  return (
    <div className="stack gap-2xl">
      <PageHead
        over={`${prod.domain || 'Product'} · ${prod.productType} · ${prod.stage}`}
        title={prod.name}
        sub={prod.description || pr.summary || 'Add a description or import knowledge to give Compass more context.'}
        right={<Button variant="accent" onClick={() => go(`/prod/${prod.id}/new`)}>+ {t('New initiative')}</Button>}
      />

      <form className="card row gap-sm" style={{ padding: 8, paddingLeft: 16 }} onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/prod/${prod.id}/ask?q=${encodeURIComponent(q.trim())}`); }}>
        <span aria-hidden className="t-brand">⌕</span>
        <input className="input grow" style={{ border: 0, boxShadow: 'none' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Ask anything about ${prod.name} — e.g. "Why do users abandon checkout?"`} aria-label="Ask the product" />
        <Button type="submit" variant="primary" disabled={!q.trim()}>{t('Ask')}</Button>
      </form>

      <section className="stack gap-md">
        <div className="row between"><h2 className="h3">{t('Initiatives')}</h2><span className="body-sm t-tertiary">Each initiative is one business intent moving through the life cycle</span></div>
        {inits.length === 0 ? (
          <button className="action-card recommended" onClick={() => go(`/prod/${prod.id}/new`)} style={{ padding: 24 }}>
            <Badge tone="accent">★ Start here</Badge>
            <div className="h3">What outcome does the business want?</div>
            <div className="t-secondary">Enter your first business intent. Compass will search {stats.docs ? `the ${stats.docs} documents in this product` : 'this product'} and suggest the next best action.</div>
          </button>
        ) : (
          <div className="grid-3">
            {inits.map((p) => {
              const cur = currentPhase(p);
              const totals = PHASES.map((ph) => phaseProgress(p, ph));
              const done = totals.reduce((a, x) => a + x.done, 0), total = totals.reduce((a, x) => a + x.total, 0);
              return (
                <button key={p.id} className="action-card" onClick={() => go(`/p/${p.id}`)}>
                  <div className="row gap-sm wrap"><PhaseChip phase={cur} active />{alertState(p) && <Badge tone="danger">Usage alert</Badge>}</div>
                  <div className="h4">{p.name}</div>
                  <div className="body-sm t-secondary">{p.intent}</div>
                  <div className="progress"><span style={{ width: `${(done / total) * 100}%` }} /></div>
                  <div className="mono-sm t-tertiary">{done}/{total} actions · {p.artefacts.length} artefacts · {p.stories.length} stories</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pad-xl stack gap-md">
          <div className="row between"><h2 className="h3">{t('Product knowledge')}</h2><Button size="sm" variant="secondary" onClick={() => go(`/prod/${prod.id}/knowledge`)}>Manage</Button></div>
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="kpi"><span className="label-sm t-tertiary">Documents</span><span className="v">{stats.docs}</span></div>
            <div className="kpi"><span className="label-sm t-tertiary">From initiatives</span><span className="v">{stats.artefactChunks + stats.stories}</span></div>
            <div className="kpi"><span className="label-sm t-tertiary">Searchable chunks</span><span className="v">{stats.chunks}</span></div>
          </div>
          <p className="body-sm t-secondary">Compass searches <strong>all</strong> of this when it suggests actions or generates artefacts in any initiative: uploaded documents, the product profile, and every other initiative's intents, artefacts, stories and release history.</p>
          {pr.personas.length > 0 && <div className="stack gap-xs"><span className="label-sm t-tertiary">Personas</span><div className="row gap-xs wrap">{pr.personas.map((x) => <Badge key={x} tone="info">{x}</Badge>)}</div></div>}
          {pr.modules.length > 0 && <div className="stack gap-xs"><span className="label-sm t-tertiary">Modules</span><div className="row gap-xs wrap">{pr.modules.map((x) => <Badge key={x} tone="brand">{x}</Badge>)}</div></div>}
          {pr.kpis.length > 0 && <div className="stack gap-xs"><span className="label-sm t-tertiary">KPIs</span>{pr.kpis.slice(0, 4).map((x) => <span key={x} className="body-sm">• {x}</span>)}</div>}
          {!stats.docs && <div className="panel body-sm">No documents yet. <button className="btn ghost sm" onClick={() => go(`/prod/${prod.id}/knowledge`)}>Upload knowledge</button> — or just start an initiative; its artefacts become product knowledge automatically.</div>}
        </section>

        <section className="card pad-xl stack gap-md">
          <h2 className="h3">Recent changes across the product</h2>
          {changes.length ? changes.map((c) => (
            <button key={c.id} className="option" style={{ padding: 10 }} onClick={() => go(`/p/${c.init.id}/release`)}>
              <span className="mono-sm t-tertiary" style={{ minWidth: 84 }}>{c.date}</span>
              <span className="stack"><span className="label-md">{c.title}</span><span className="body-sm t-tertiary">{c.init.name} · {c.type} · {c.rollout}%</span></span>
            </button>
          )) : <div className="body-sm t-tertiary">Nothing released yet.</div>}
        </section>
      </div>
    </div>
  );
}
