import { useState } from 'react';
import { go } from '../App';
import { download, storiesToCSV, storyToMarkdown } from '../generators';
import { runAction } from '../run';
import { store, uid, useStore } from '../store';
import type { Project, Story } from '../types';
import { Badge, Button, Field, PageHead, StoryCard, toast } from '../ui';

export function BacklogPage({ p }: { p: Project }) {
  const { settings } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<'cards' | 'map'>('cards');
  const [busy, setBusy] = useState(false);
  const epics = [...new Set(p.stories.map((s) => s.epic))];
  const story = p.stories.find((s) => s.id === open);
  const pts = p.stories.reduce((a, s) => a + s.points, 0);

  const gen = async (ai: boolean) => {
    setBusy(true);
    try { await runAction(p, 'user-stories', ai); toast('Stories generated'); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  };
  const addBlank = () => {
    const n = (p.stories.length ? Math.max(...p.stories.map((s) => +s.key.replace('US-', ''))) : 0) + 1;
    const s: Story = { id: uid(), key: `US-${n}`, epic: 'New epic', feature: 'New epic', title: 'New story', asA: 'user', iWant: 'to …', soThat: '…', ac: ['Given …\nWhen …\nThen …'], priority: 'Should', points: 3, status: 'To do', events: [] };
    store.updateProject(p.id, (x) => ({ ...x, stories: [...x.stories, s] }));
    setOpen(s.id);
  };

  return (
    <div className="stack gap-xl">
      <PageHead
        over="Build · Detailed user stories"
        title="Backlog"
        sub={p.stories.length ? `${p.stories.length} stories · ${epics.length} epics · ${pts} points · MVP (Must) ${p.stories.filter((s) => s.priority === 'Must').reduce((a, s) => a + s.points, 0)} pts` : 'Generate INVEST user stories with Gherkin acceptance criteria and tracking events from your scope.'}
        right={<>
          <Button variant="accent" disabled={busy} onClick={() => gen(false)}>{p.stories.length ? 'Generate more' : 'Generate user stories'}</Button>
          {settings.apiKey && <Button variant="primary" disabled={busy} onClick={() => gen(true)}>{busy ? 'Working…' : '✦ With Claude'}</Button>}
          <Button variant="secondary" onClick={addBlank}>+ Story</Button>
        </>}
      />
      {p.stories.length > 0 && (
        <div className="row gap-sm wrap">
          <div className="seg"><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Cards</button><button aria-pressed={view === 'map'} onClick={() => setView('map')}>Story map</button></div>
          <span className="grow" />
          <Button variant="ghost" size="sm" onClick={() => download(`${p.name}-stories-jira.csv`, storiesToCSV(p.stories), 'text/csv')}>Export CSV (Jira / Azure DevOps)</Button>
          <Button variant="ghost" size="sm" onClick={() => download(`${p.name}-stories.md`, p.stories.map(storyToMarkdown).join('\n---\n\n'))}>Export .md</Button>
          <Button variant="ghost" size="sm" onClick={() => go(`/p/${p.id}/actions?select=prioritisation`)}>Prioritise →</Button>
        </div>
      )}
      {p.stories.length === 0 && <div className="empty">No stories yet. Tip: add capabilities in Overview → Edit context for more specific stories.</div>}

      {view === 'cards' ? epics.map((e) => (
        <section key={e} className="stack gap-md">
          <div className="row gap-sm"><span className="h3">{e}</span><Badge>{p.stories.filter((s) => s.epic === e).length} stories</Badge></div>
          <div className="grid-3">{p.stories.filter((s) => s.epic === e).map((s) => <StoryCard key={s.id} s={s} onClick={() => setOpen(s.id)} />)}</div>
        </section>
      )) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Epic</th><th>Release 1 · Must</th><th>Release 2 · Should</th><th>Later · Could</th></tr></thead>
            <tbody>{epics.map((e) => (
              <tr key={e}><td><strong>{e}</strong></td>{(['Must', 'Should', 'Could'] as const).map((pr) => (
                <td key={pr}><div className="stack gap-xs">{p.stories.filter((s) => s.epic === e && (s.priority === pr || (pr === 'Could' && s.priority === "Won't"))).map((s) => <button key={s.id} className="option" style={{ padding: 8 }} onClick={() => setOpen(s.id)}><span className="mono-sm t-brand">{s.key}</span><span className="body-sm">{s.title}</span></button>)}</div></td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {story && <StoryDrawer p={p} s={story} onClose={() => setOpen(null)} />}
    </div>
  );
}

function StoryDrawer({ p, s, onClose }: { p: Project; s: Story; onClose: () => void }) {
  const set = (patch: Partial<Story>) => store.updateProject(p.id, (x) => ({ ...x, stories: x.stories.map((y) => (y.id === s.id ? { ...y, ...patch } : y)) }));
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Story ${s.key}`}>
        <div className="row between"><span className="mono t-brand">{s.key}</span><Button variant="ghost" size="sm" onClick={onClose}>Close</Button></div>
        <Field label="Title"><input className="input" value={s.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Epic"><input className="input" value={s.epic} onChange={(e) => set({ epic: e.target.value })} /></Field>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Priority"><select className="select" value={s.priority} onChange={(e) => set({ priority: e.target.value as Story['priority'] })}><option>Must</option><option>Should</option><option>Could</option><option>Won't</option></select></Field>
          <Field label="Points"><select className="select" value={s.points} onChange={(e) => set({ points: +e.target.value })}>{[1, 2, 3, 5, 8, 13].map((n) => <option key={n}>{n}</option>)}</select></Field>
          <Field label="Status"><select className="select" value={s.status} onChange={(e) => set({ status: e.target.value as Story['status'] })}><option>To do</option><option>In progress</option><option>Done</option></select></Field>
        </div>
        <Field label="As a"><input className="input" value={s.asA} onChange={(e) => set({ asA: e.target.value })} /></Field>
        <Field label="I want"><input className="input" value={s.iWant} onChange={(e) => set({ iWant: e.target.value })} /></Field>
        <Field label="So that"><input className="input" value={s.soThat} onChange={(e) => set({ soThat: e.target.value })} /></Field>
        <div className="stack gap-sm">
          <div className="row between"><span className="label-md">Acceptance criteria (Gherkin)</span><Button size="sm" variant="ghost" onClick={() => set({ ac: [...s.ac, 'Given …\nWhen …\nThen …'] })}>+ Add</Button></div>
          {s.ac.map((a, i) => (
            <div key={i} className="stack gap-xs">
              <textarea className="textarea mono" style={{ minHeight: 76 }} value={a} onChange={(e) => set({ ac: s.ac.map((x, j) => (j === i ? e.target.value : x)) })} />
              <div><Button size="sm" variant="danger" onClick={() => set({ ac: s.ac.filter((_, j) => j !== i) })}>Remove AC{i + 1}</Button></div>
            </div>
          ))}
        </div>
        <Field label="Tracking events" help="Comma separated, snake_case"><input className="input mono" value={s.events.join(', ')} onChange={(e) => set({ events: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
        <div className="panel stack gap-xs body-sm"><strong>INVEST check</strong>
          <span>{s.ac.length >= 2 ? '✓' : '⚠'} Testable: {s.ac.length} acceptance criteria</span>
          <span>{s.points <= 8 ? '✓' : '⚠'} Small: {s.points <= 8 ? 'fits in a sprint' : 'consider splitting'}</span>
          <span>{/so that .{6,}/i.test('so that ' + s.soThat) ? '✓' : '⚠'} Valuable: has a "so that"</span>
          <span>{s.events.length ? '✓' : '⚠'} Measurable: {s.events.length ? 'tracking events defined' : 'no tracking events'}</span>
        </div>
        <div><Button variant="danger" size="sm" onClick={() => { store.updateProject(p.id, (x) => ({ ...x, stories: x.stories.filter((y) => y.id !== s.id) })); onClose(); }}>Delete story</Button></div>
      </div>
    </div>
  );
}
