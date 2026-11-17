import { useState } from 'react';
import { go } from '../App';
import { byId, PHASE_INFO } from '../catalog';
import { download, figmaLayoutSpec } from '../generators';
import { runAction } from '../run';
import { store, useStore } from '../store';
import { PHASES, type Project } from '../types';
import { Badge, Button, Markdown, PageHead, PhaseChip, toast } from '../ui';

export function ArtefactsPage({ p }: { p: Project }) {
  return (
    <div className="stack gap-xl">
      <PageHead over="Outputs" title="Artefacts" sub="Everything Compass generated for this project. Each artefact is editable, versioned and traced back to the business need." right={<Button variant="accent" onClick={() => go(`/p/${p.id}/actions`)}>Generate more</Button>} />
      {p.artefacts.length === 0 && <div className="empty">No artefacts yet. Pick a next action to generate your first one.</div>}
      {PHASES.map((ph) => {
        const list = p.artefacts.filter((a) => a.phase === ph);
        if (!list.length) return null;
        return (
          <section key={ph} className="stack gap-md">
            <div className="row gap-sm"><PhaseChip phase={ph} /><span className="body-sm t-tertiary">{PHASE_INFO[ph].babok}</span></div>
            <div className="grid-3">
              {list.map((a) => (
                <button key={a.id} className="action-card" onClick={() => go(`/p/${p.id}/a/${a.id}`)}>
                  <div className="row gap-sm wrap"><Badge tone={a.status === 'approved' ? 'success' : 'warning'}>{a.status === 'approved' ? 'Approved' : 'Draft'}</Badge><span className="mono-sm t-tertiary">v{a.version}</span>{a.ai && <Badge tone="brand">✦ Claude</Badge>}</div>
                  <div className="h4">{a.title}</div>
                  <div className="mono-sm t-tertiary">{byId(a.actionId).babok}</div>
                  <div className="body-sm t-tertiary">Updated {new Date(a.updatedAt).toLocaleString()}</div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ArtefactPage({ p, id }: { p: Project; id: string }) {
  const a = p.artefacts.find((x) => x.id === id);
  const { settings } = useStore();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!a) return <div className="empty">Artefact not found.</div>;
  const def = byId(a.actionId);
  const set = (patch: Partial<typeof a>) => store.updateProject(p.id, (x) => ({ ...x, artefacts: x.artefacts.map((y) => (y.id === a.id ? { ...y, ...patch, updatedAt: new Date().toISOString() } : y)) }));
  const regen = async (ai: boolean) => {
    if (!confirm('Regenerate? Your manual edits in this artefact will be replaced (a new version is created).')) return;
    setBusy(true);
    try { await runAction(p, a.actionId, ai); toast('New version generated'); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="stack gap-xl">
      <div className="row gap-sm"><Button variant="ghost" size="sm" onClick={() => go(`/p/${p.id}/artefacts`)}>← All artefacts</Button></div>
      <PageHead
        over={`${PHASE_INFO[a.phase].name} · ${def.output}`}
        title={a.title}
        right={<>
          <Button variant={editing ? 'primary' : 'secondary'} size="sm" onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit'}</Button>
          {a.status === 'draft' ? <Button variant="accent" size="sm" onClick={() => { set({ status: 'approved' }); toast('Approved'); }}>Approve</Button> : <Button variant="secondary" size="sm" onClick={() => set({ status: 'draft' })}>Reopen</Button>}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => regen(false)}>Regenerate</Button>
          {settings.apiKey && <Button variant="ghost" size="sm" disabled={busy} onClick={() => regen(true)}>{busy ? 'Working…' : '✦ Improve with Claude'}</Button>}
        </>}
      />
      <div className="row gap-sm wrap">
        <PhaseChip phase={a.phase} />
        <Badge tone={a.status === 'approved' ? 'success' : 'warning'}>{a.status === 'approved' ? 'Approved' : 'Draft'}</Badge>
        <span className="mono-sm t-tertiary">v{a.version} · {new Date(a.updatedAt).toLocaleString()}</span>
        {a.ai && <Badge tone="brand">✦ Generated with Claude</Badge>}
        <span className="grow" />
        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(a.content); toast('Copied as Markdown'); }}>Copy</Button>
        <Button variant="ghost" size="sm" onClick={() => download(`${a.title}.md`, a.content)}>Export .md</Button>
        {a.actionId === 'ux-brief' && <Button variant="ghost" size="sm" onClick={() => download(`${p.name}-figma-layout.json`, figmaLayoutSpec(p), 'application/json')}>Export Figma layout spec</Button>}
        {a.actionId === 'ux-brief' && <a className="btn ghost sm" href="https://www.figma.com/design/5e1GvRGmOSfiPS8HeoTkrr" target="_blank" rel="noreferrer">Open design system ↗</a>}
      </div>

      <div className="card pad-xl">
        {editing ? (
          <textarea className="textarea mono" style={{ minHeight: '60vh', fontSize: 13 }} value={a.content} onChange={(e) => set({ content: e.target.value })} aria-label="Markdown editor" />
        ) : <Markdown text={a.content} />}
      </div>

      <div className="panel body-sm t-secondary">
        <strong>Traceability:</strong> this artefact supports the business need "{p.intent}". {a.actionId === 'requirements' && p.stories.length > 0 && `It is realised by ${p.stories.length} user stories in the backlog.`}
      </div>
      <div><Button variant="danger" size="sm" onClick={() => { if (confirm('Delete this artefact?')) { store.updateProject(p.id, (x) => ({ ...x, artefacts: x.artefacts.filter((y) => y.id !== a.id) })); go(`/p/${p.id}/artefacts`); } }}>Delete artefact</Button></div>
    </div>
  );
}
