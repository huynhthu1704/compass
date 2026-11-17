import { useState } from 'react';
import { go, query } from '../App';
import { aiProfile } from '../ai';
import { extractProfile, knowledgeStats } from '../knowledge';
import { store, useStore } from '../store';
import { DOC_CATEGORIES, type DocCategory, type Product, type Profile } from '../types';
import { Badge, Button, Field, Markdown, PageHead, toast } from '../ui';
import { KnowledgeUpload } from './KnowledgeUpload';

export function ProductKnowledge({ prod }: { prod: Product }) {
  const { projects, settings } = useStore();
  const [open, setOpen] = useState<string | null>(query().get('doc'));
  const [busy, setBusy] = useState(false);
  const welcome = query().get('welcome');
  const stats = knowledgeStats(prod, projects);
  const doc = prod.docs.find((d) => d.id === open);
  const inits = projects.filter((p) => p.productId === prod.id);
  const set = (fn: (p: Product) => Product) => store.updateProduct(prod.id, fn);

  const rebuild = async (ai: boolean) => {
    setBusy(true);
    try {
      const profile = ai ? await aiProfile(settings, prod) : extractProfile(prod);
      set((p) => ({ ...p, profile: { ...profile, summary: profile.summary || p.profile.summary } }));
      toast(ai ? 'Profile built with Claude' : 'Profile rebuilt from knowledge');
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="stack gap-xl">
      <PageHead
        over={`${prod.name} · Knowledge base`}
        title="Product knowledge"
        sub="One knowledge base for the whole product. Uploaded documents plus everything produced in every initiative are searched together — never just one module."
        right={<Button variant="accent" onClick={() => go(`/prod/${prod.id}/new`)}>Start an initiative</Button>}
      />

      {welcome && prod.docs.length > 0 && (
        <div className="card stack gap-sm" style={{ background: 'var(--color-bg-brand-subtle)', borderColor: 'var(--color-border-brand)' }}>
          <div className="h4 t-brand">Knowledge imported — {prod.docs.length} documents, {stats.chunks} searchable chunks</div>
          <div className="body-sm t-secondary">Compass drafted a product profile below from your documents. Review it, then start your first initiative: Compass will pre-fill personas, KPIs and constraints, and cite your documents in every artefact.</div>
        </div>
      )}

      <section className="stack gap-md">
        <div className="row between wrap gap-sm">
          <h2 className="h3">Product profile</h2>
          <div className="row gap-sm">
            {prod.profile.builtAt && <span className="body-sm t-tertiary">{prod.profile.ai ? '✦ Claude' : 'Auto-extracted'} · {new Date(prod.profile.builtAt).toLocaleDateString()}</span>}
            <Button size="sm" variant="secondary" disabled={busy || !prod.docs.length} onClick={() => rebuild(false)}>Rebuild from documents</Button>
            {settings.apiKey && <Button size="sm" variant="primary" disabled={busy || !prod.docs.length} onClick={() => rebuild(true)}>{busy ? 'Working…' : '✦ Build with Claude'}</Button>}
          </div>
        </div>
        <ProfileEditor profile={prod.profile} onChange={(profile) => set((p) => ({ ...p, profile }))} />
      </section>

      <section className="stack gap-md">
        <div className="row gap-sm"><h2 className="h3">Documents</h2><Badge tone="brand">{prod.docs.length}</Badge></div>
        <KnowledgeUpload compact onAdd={(docs) => set((p) => ({ ...p, docs: [...p.docs, ...docs] }))} />
        {prod.docs.length > 0 && (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Document</th><th>Type</th><th>Size</th><th>Added</th><th /></tr></thead>
            <tbody>{prod.docs.map((d) => (
              <tr key={d.id}>
                <td><button className="btn ghost sm" style={{ padding: 0 }} onClick={() => setOpen(d.id)}>{d.title}</button>{d.fileName && <div className="mono-sm t-tertiary">{d.fileName}</div>}</td>
                <td><select className="select" style={{ padding: '2px 6px', fontSize: 12 }} value={d.category} onChange={(e) => set((p) => ({ ...p, docs: p.docs.map((x) => (x.id === d.id ? { ...x, category: e.target.value as DocCategory } : x)) }))}>{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></td>
                <td className="mono-sm">{(d.content.length / 1000).toFixed(1)}k</td>
                <td className="mono-sm">{d.addedAt.slice(0, 10)}</td>
                <td><Button size="sm" variant="danger" onClick={() => confirm(`Remove "${d.title}" from the knowledge base?`) && set((p) => ({ ...p, docs: p.docs.filter((x) => x.id !== d.id) }))}>Remove</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="stack gap-md">
        <h2 className="h3">Included automatically from initiatives</h2>
        {inits.length ? (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Initiative</th><th>Artefacts</th><th>Stories</th><th>Changes</th></tr></thead>
            <tbody>{inits.map((p) => <tr key={p.id}><td><button className="btn ghost sm" style={{ padding: 0 }} onClick={() => go(`/p/${p.id}`)}>{p.name}</button></td><td>{p.artefacts.length}</td><td>{p.stories.length}</td><td>{p.changelog.length}</td></tr>)}</tbody>
          </table></div>
        ) : <div className="body-sm t-tertiary">No initiatives yet. Every artefact, story and release you create will be added here automatically.</div>}
      </section>

      {doc && (
        <div className="drawer-backdrop" onClick={() => setOpen(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={doc.title}>
            <div className="row between"><Badge>{doc.category}</Badge><Button size="sm" variant="ghost" onClick={() => setOpen(null)}>Close</Button></div>
            <h2 className="h2">{doc.title}</h2>
            <Markdown text={doc.content} />
          </div>
        </div>
      )}
    </div>
  );
}

function ListField({ label, items, onChange, tone }: { label: string; items: string[]; onChange: (v: string[]) => void; tone: 'info' | 'brand' | 'neutral' | 'warning' }) {
  const [v, setV] = useState('');
  return (
    <div className="stack gap-xs">
      <span className="label-md">{label}</span>
      <div className="row gap-xs wrap">
        {items.map((x) => <span key={x} className={`badge tone-${tone}`}>{x}<button aria-label={`Remove ${x}`} onClick={() => onChange(items.filter((y) => y !== x))} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, marginLeft: 2 }}>×</button></span>)}
        <input className="input" style={{ width: 200, padding: '2px 8px', fontSize: 13 }} value={v} placeholder="+ add" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onChange([...items, v.trim()]); setV(''); } }} />
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }) {
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  return (
    <div className="card pad-xl stack gap-lg">
      <Field label="Summary"><textarea className="textarea" style={{ minHeight: 72 }} value={profile.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="What the product does, for whom, and how it makes money" /></Field>
      <ListField label="Personas / user groups" items={profile.personas} tone="info" onChange={(personas) => set({ personas })} />
      <ListField label="Modules / capabilities" items={profile.modules} tone="brand" onChange={(modules) => set({ modules })} />
      <ListField label="KPIs (with current values)" items={profile.kpis} tone="neutral" onChange={(kpis) => set({ kpis })} />
      <ListField label="Constraints" items={profile.constraints} tone="warning" onChange={(constraints) => set({ constraints })} />
      {profile.glossary.length > 0 && (
        <div className="stack gap-xs"><span className="label-md">Glossary ({profile.glossary.length})</span>
          <div className="tbl-wrap"><table className="tbl"><tbody>{profile.glossary.map((g) => <tr key={g.term}><td style={{ width: 180 }}><strong>{g.term}</strong></td><td>{g.def}</td><td style={{ width: 40 }}><button className="btn danger sm" onClick={() => set({ glossary: profile.glossary.filter((x) => x.term !== g.term) })}>×</button></td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
