import { useRef } from 'react';
import { go } from '../App';
import { alertState, currentPhase } from '../engine';
import { download } from '../generators';
import { useT } from '../i18n';
import { sampleProduct } from '../samples';
import { store, useStore } from '../store';
import type { State } from '../types';
import { Badge, Button, PageHead, PhaseChip, toast } from '../ui';

export function openSample() {
  const { product, projects } = sampleProduct();
  store.addProduct(product);
  projects.forEach((p) => store.addProject(p));
  go(`/prod/${product.id}`);
}

export function ProductsPage() {
  const { products, projects } = useStore();
  const t = useT();
  const file = useRef<HTMLInputElement>(null);

  const importJSON = async (f: File) => {
    try {
      const s = JSON.parse(await f.text()) as Partial<State>;
      if (!Array.isArray(s.projects) && !Array.isArray(s.products)) throw new Error();
      store.mergeIn(s);
      toast(`Imported ${(s.products || []).length} product(s), ${(s.projects || []).length} initiative(s)`);
    } catch { toast('That file is not a Compass backup'); }
  };

  return (
    <div>
      <PageHead
        over="Compass"
        title={t('Your products')}
        sub="A product holds everything you know: its knowledge base and every initiative (business intent) you run on it. Each new initiative learns from all of it."
        right={<>
          <Button variant="secondary" onClick={openSample}>Open sample product</Button>
          <Button variant="accent" onClick={() => go('/new-product')}>+ {t('New product')}</Button>
        </>}
      />
      {products.length === 0 ? (
        <div className="grid-2">
          <button className="action-card recommended" onClick={() => go('/new-product?mode=scratch')} style={{ padding: 24 }}>
            <Badge tone="accent">Start fresh</Badge>
            <div className="h3">Build a product from scratch</div>
            <div className="t-secondary">You have an idea or a new product. Start with the business intent; Compass builds the knowledge as you go.</div>
          </button>
          <button className="action-card" onClick={() => go('/new-product?mode=import')} style={{ padding: 24 }}>
            <Badge tone="brand">Existing product</Badge>
            <div className="h3">Import an existing product's knowledge</div>
            <div className="t-secondary">Upload PRDs, research, analytics, SOPs, glossaries (PDF, Word, Markdown, CSV…). Compass builds a product profile and uses it in every initiative.</div>
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {products.map((pr) => {
            const inits = projects.filter((p) => p.productId === pr.id);
            const alerts = inits.filter((p) => alertState(p)).length;
            return (
              <button key={pr.id} className="action-card" onClick={() => go(`/prod/${pr.id}`)}>
                <div className="row gap-sm wrap"><Badge tone={pr.origin === 'imported' ? 'brand' : 'neutral'}>{pr.origin === 'imported' ? 'Imported' : 'From scratch'}</Badge><Badge>{pr.productType}</Badge>{alerts > 0 && <Badge tone="danger">{alerts} alert</Badge>}</div>
                <div className="h3">{pr.name}</div>
                <div className="body-sm t-secondary">{pr.description || pr.profile.summary || pr.domain || 'No description yet'}</div>
                <div className="row gap-xs wrap">{inits.slice(0, 4).map((p) => <PhaseChip key={p.id} phase={currentPhase(p)} />)}</div>
                <div className="mono-sm t-tertiary">{pr.docs.length} docs · {inits.length} initiatives · {inits.reduce((a, p) => a + p.artefacts.length, 0)} artefacts · {inits.reduce((a, p) => a + p.stories.length, 0)} stories</div>
              </button>
            );
          })}
        </div>
      )}
      <div className="row gap-sm wrap" style={{ marginTop: 32 }}>
        <Button variant="ghost" size="sm" onClick={() => download('compass-backup.json', JSON.stringify(store.get(), (k, v) => (k === 'apiKey' ? undefined : v), 2), 'application/json')}>Export backup (JSON)</Button>
        <Button variant="ghost" size="sm" onClick={() => file.current?.click()}>Import backup</Button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
        <span className="body-sm t-tertiary" style={{ alignSelf: 'center' }}>Data is stored only in this browser.</span>
      </div>
    </div>
  );
}
