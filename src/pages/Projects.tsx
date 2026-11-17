import { useRef } from 'react';
import { go } from '../App';
import { PHASE_INFO } from '../catalog';
import { currentPhase, phaseProgress } from '../engine';
import { download } from '../generators';
import { useT } from '../i18n';
import { sampleProject, withSampleData } from '../samples';
import { store, useStore } from '../store';
import { PHASES, type State } from '../types';
import { Badge, Button, PageHead, PhaseChip, toast } from '../ui';

export function ProjectsPage() {
  const { projects } = useStore();
  const t = useT();
  const file = useRef<HTMLInputElement>(null);

  const addSample = () => {
    const p = withSampleData(sampleProject());
    store.addProject(p);
    go(`/p/${p.id}`);
  };

  const importJSON = async (f: File) => {
    try {
      const s = JSON.parse(await f.text()) as State;
      if (!Array.isArray(s.projects)) throw new Error();
      store.replaceAll({ ...store.get(), projects: s.projects });
      toast(`Imported ${s.projects.length} project(s)`);
    } catch { toast('That file is not a Compass backup'); }
  };

  return (
    <div>
      <PageHead
        over="Compass"
        title={t('Your projects')}
        sub="Each project starts with a business intent and moves through six phases, from discovery to monitoring usage after rollout."
        right={<>
          <Button variant="secondary" onClick={addSample}>Open sample project</Button>
          <Button variant="accent" onClick={() => go('/new')}>+ {t('New project')}</Button>
        </>}
      />
      {projects.length === 0 ? (
        <div className="empty stack gap-md" style={{ alignItems: 'center' }}>
          <div className="h3" style={{ color: 'var(--color-text-primary)' }}>No projects yet</div>
          <p>Start with a business intent, or open the sample "Checkout drop-off" project to explore every phase.</p>
          <div className="row gap-sm"><Button variant="accent" onClick={() => go('/new')}>Start a project</Button><Button variant="secondary" onClick={addSample}>Open sample</Button></div>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((p) => {
            const cur = currentPhase(p);
            const totals = PHASES.map((ph) => phaseProgress(p, ph));
            const done = totals.reduce((a, x) => a + x.done, 0), total = totals.reduce((a, x) => a + x.total, 0);
            return (
              <button key={p.id} className="action-card" onClick={() => go(`/p/${p.id}`)}>
                <div className="row gap-sm wrap"><PhaseChip phase={cur} active /><Badge>{p.productType}</Badge><Badge>{p.size}</Badge></div>
                <div className="h3">{p.name}</div>
                <div className="body-sm t-secondary">{p.intent}</div>
                <div className="progress" aria-label="progress"><span style={{ width: `${(done / total) * 100}%` }} /></div>
                <div className="mono-sm t-tertiary">{done}/{total} actions · now in {PHASE_INFO[cur].name} · {p.stories.length} stories</div>
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
