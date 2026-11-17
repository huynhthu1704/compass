import { useState } from 'react';
import { go, query } from '../App';
import { extractProfile } from '../knowledge';
import { newProduct } from '../samples';
import { store } from '../store';
import type { KDoc, Product } from '../types';
import { Badge, Button, Field, PageHead } from '../ui';
import { KnowledgeUpload } from './KnowledgeUpload';

export function NewProduct() {
  const initial = (query().get('mode') as 'scratch' | 'import') || 'scratch';
  const [mode, setModeRaw] = useState<'scratch' | 'import'>(initial);
  const [p, setP] = useState<Product>(() => newProduct({ stage: initial === 'scratch' ? 'Idea' : 'Existing product' }));
  const [docs, setDocs] = useState<KDoc[]>([]);
  const setMode = (m: 'scratch' | 'import') => { setModeRaw(m); setP((x) => ({ ...x, stage: m === 'scratch' ? 'Idea' : 'Existing product' })); };
  const up = (patch: Partial<Product>) => setP((x) => ({ ...x, ...patch }));

  const create = () => {
    let prod: Product = { ...p, name: p.name === 'Untitled product' ? 'My product' : p.name, origin: mode === 'import' ? 'imported' : 'scratch', docs };
    if (docs.length) prod = { ...prod, profile: extractProfile(prod) };
    store.addProduct(prod);
    go(mode === 'import' ? `/prod/${prod.id}/knowledge?welcome=1` : `/prod/${prod.id}/new`);
  };

  return (
    <div className="stack gap-xl" style={{ maxWidth: 860 }}>
      <PageHead over="New product" title="How do you want to start?" />
      <div className="grid-2">
        <button className="option" aria-pressed={mode === 'scratch'} onClick={() => setMode('scratch')} style={{ padding: 20 }}>
          <span className="stack gap-xs"><span className="h4">Start from scratch</span><span className="body-sm t-secondary">New idea or new product. You'll go straight to your first business intent.</span></span>
        </button>
        <button className="option" aria-pressed={mode === 'import'} onClick={() => setMode('import')} style={{ padding: 20 }}>
          <span className="stack gap-xs"><span className="h4">Import an existing product</span><span className="body-sm t-secondary">Upload what you already have. Compass builds a product profile and searches it in every initiative.</span></span>
        </button>
      </div>

      <div className="card pad-xl stack gap-lg">
        <div className="grid-2">
          <Field label="Product name"><input className="input" autoFocus value={p.name === 'Untitled product' ? '' : p.name} placeholder="e.g. ShopNow mobile app" onChange={(e) => up({ name: e.target.value || 'Untitled product' })} /></Field>
          <Field label="Domain / industry"><input className="input" value={p.domain} placeholder="e.g. Banking, E-commerce, Logistics" onChange={(e) => up({ domain: e.target.value })} /></Field>
        </div>
        <Field label="One-line description" help="What the product does and for whom."><input className="input" value={p.description} placeholder="e.g. Fashion e-commerce for Vietnamese shoppers on mobile" onChange={(e) => up({ description: e.target.value })} /></Field>
        <div className="grid-2">
          <Field label="Product type"><select className="select" value={p.productType} onChange={(e) => up({ productType: e.target.value as Product['productType'] })}><option>B2C</option><option>B2B</option><option>Internal</option></select></Field>
          <Field label="Stage"><select className="select" value={p.stage} onChange={(e) => up({ stage: e.target.value as Product['stage'] })}><option>Idea</option><option>Existing product</option><option>Live feature</option></select></Field>
        </div>
      </div>

      {mode === 'import' && (
        <div className="stack gap-md">
          <div className="row gap-sm"><h2 className="h3">Knowledge base</h2><Badge tone="brand">{docs.length} document{docs.length === 1 ? '' : 's'}</Badge></div>
          <KnowledgeUpload onAdd={(d) => setDocs((x) => [...x, ...d])} />
          {docs.length > 0 && (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Document</th><th>Detected type</th><th>Size</th><th /></tr></thead>
              <tbody>{docs.map((d) => <tr key={d.id}><td>{d.title}</td><td><Badge>{d.category}</Badge></td><td className="mono-sm">{(d.content.length / 1000).toFixed(1)}k chars</td><td><Button size="sm" variant="danger" onClick={() => setDocs((x) => x.filter((y) => y.id !== d.id))}>Remove</Button></td></tr>)}</tbody>
            </table></div>
          )}
          <p className="body-sm t-tertiary">Files are read in your browser and stored only on this device. You can add more later.</p>
        </div>
      )}

      <div className="row gap-sm">
        <Button variant="accent" onClick={create} disabled={mode === 'import' && !docs.length && !p.description}>{mode === 'import' ? 'Create product & build profile' : 'Create product & set first intent'}</Button>
        <Button variant="ghost" onClick={() => go('/')}>Cancel</Button>
      </div>
    </div>
  );
}
