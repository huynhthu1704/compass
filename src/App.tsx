import { useEffect, useState } from 'react';
import { ArchitecturePage } from './pages/Architecture';
import { BuildPage } from './pages/Build';
import { ConnectPage } from './pages/Connect';
import { IdeaPage } from './pages/Idea';
import { ImportPage } from './pages/Import';
import { KnowledgePage } from './pages/Knowledge';
import { NewProjectPage } from './pages/NewProject';
import { Onboarding } from './pages/Onboarding';
import { OverviewPage } from './pages/Overview';
import { ProjectsPage } from './pages/Projects';
import { ReleasePage } from './pages/Release';
import { DesignPage } from './pages/Design';
import { RequirementsPage } from './pages/Requirements';
import { RunPage, RunsPage } from './pages/Runs';
import { TestsPage } from './pages/Tests';
import { TeamFloorPage } from './pages/TeamFloor';
import { syncLabel, useSync } from './autosync';
import { featureStage, stageStatus } from './progress';
import { FeaturePage } from './pages/Feature';
import { store, useStore } from './store';
import { STAGES, type Stage } from './types';
import { STAGE_INFO, Toaster } from './ui';

export const go = (path: string) => { window.location.hash = path; window.scrollTo(0, 0); };
export const query = () => new URLSearchParams(window.location.hash.split('?')[1] || '');

function useRoute() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => { const on = () => setHash(window.location.hash.slice(1) || '/'); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  return hash.split('?')[0].split('/').filter(Boolean);
}

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="10" fill="var(--color-bg-brand)" /><path d="M16 6l4 10-4 10-4-10z" fill="var(--ink-900)" /><circle cx="16" cy="16" r="2" fill="var(--honey-50)" /></svg>
);

export default function App() {
  const state = useStore();
  const { settings } = state;
  const parts = useRoute();
  const [menu, setMenu] = useState(false);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme; document.documentElement.lang = settings.lang; }, [settings.theme, settings.lang]);
  useEffect(() => setMenu(false), [parts.join('/')]);

  const routeProject = parts[0] === 'p' ? parts[1] : undefined;
  const sync = useSync(routeProject); // hooks must run before any early return
  if (!settings.role) return <><Onboarding /><Toaster /></>;

  const p = parts[0] === 'p' ? state.projects.find((x) => x.id === parts[1]) : undefined;
  const sub = parts[2] || '';
  let page;
  if (parts[0] === 'connect') page = <ConnectPage />;
  else if (parts[0] === 'new') page = <NewProjectPage />;
  else if (parts[0] === 'import') page = <ImportPage />;
  else if (parts[0] === 'architecture') page = <ArchitecturePage />;
  else if (p && sub === 'f' && parts[3]) {
    const fid = parts[3], fs = parts[4] || '';
    page = fs === 'idea' ? <IdeaPage p={p} fid={fid} /> : fs === 'requirements' ? <RequirementsPage p={p} fid={fid} /> : fs === 'design' ? <DesignPage p={p} fid={fid} /> : fs === 'tests' ? <TestsPage p={p} fid={fid} />
      : fs === 'build' ? <BuildPage p={p} fid={fid} /> : <FeaturePage p={p} fid={fid} />;
  } else if (p) {
    page = sub === 'floor' ? <TeamFloorPage p={p} /> : sub === 'release' ? <ReleasePage p={p} /> : sub === 'knowledge' ? <KnowledgePage p={p} />
      : sub === 'runs' && parts[3] ? <RunPage p={p} rid={parts[3]} /> : sub === 'runs' ? <RunsPage p={p} /> : <OverviewPage p={p} />;
  } else page = <ProjectsPage />;

  const nav = (path: string, label: React.ReactNode, current: boolean, extra?: React.ReactNode) => (
    <button aria-current={current ? 'page' : undefined} onClick={() => go(path)}>{label}{extra}</button>
  );
  const fidRoute = sub === 'f' ? parts[3] : undefined;
  const fsub = parts[4] || '';
  const waiting = p ? p.runs.filter((r) => r.status === 'awaiting-approval').length : 0;
  const sl = p && p.repo && !p.demo && settings.githubToken ? syncLabel(sync, p.dirty) : null;

  return (
    <>
      <div className="mobile-top"><div className="brand"><Logo />Compass</div><button className="btn secondary sm" onClick={() => setMenu(!menu)} aria-expanded={menu}>Menu</button></div>
      <div className="app">
        <aside className={`sidebar ${menu ? 'open' : ''}`}>
          <div className="brand"><Logo />Compass <span className="badge tone-brand" style={{ fontSize: 10 }}>AI dev portal</span></div>
          <nav className="nav">
            {nav('/', 'Projects', !p && !['connect', 'architecture'].includes(parts[0]))}
            {nav('/architecture', 'Agent architecture', parts[0] === 'architecture')}
          </nav>
          {p && (
            <div className="nav-group">
              <div className="overline t-tertiary" style={{ padding: '0 12px' }}>{p.name}{p.demo ? ' · demo' : ''}</div>
              {sl && <div style={{ padding: '0 12px' }}><span className={`badge tone-${sl.tone}`} title={sync?.message} style={{ fontSize: 11 }}>{sl.text}</span></div>}
              <nav className="nav">
                {nav(`/p/${p.id}`, 'Feature board', sub === '')}
                {nav(`/p/${p.id}/floor`, 'Team floor', sub === 'floor', waiting ? <span className="badge tone-accent" style={{ marginLeft: 'auto' }}>{waiting}</span> : null)}
                {nav(`/p/${p.id}/release`, 'Release', sub === 'release')}
                {nav(`/p/${p.id}/runs`, 'Agent runs', sub === 'runs', waiting ? <span className="badge tone-accent" style={{ marginLeft: 'auto' }}>{waiting}</span> : null)}
                {nav(`/p/${p.id}/knowledge`, 'Knowledge (RAG)', sub === 'knowledge')}
              </nav>
              {p.spec.features.some((f) => !f.archived) && <div className="overline t-tertiary" style={{ padding: '8px 12px 0' }}>Features</div>}
              <nav className="nav">
                {p.spec.features.filter((f) => !f.archived || f.id === fidRoute).map((f) => {
                  const fst = featureStage(p, f.id);
                  const st = stageStatus(p, f.id);
                  return (
                    <div key={f.id} className="stack">
                      {nav(`/p/${p.id}/f/${f.id}`, <><span className={`chip ${fst === 'done' ? 'tone-success' : STAGE_INFO[fst].cls}`} style={{ padding: '0 6px', fontSize: 10 }}>{f.id.replace('F-0', 'F')}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span></>, fidRoute === f.id && fsub === '')}
                      {fidRoute === f.id && (
                        <nav className="nav" style={{ paddingLeft: 12, borderLeft: '1px solid var(--color-border-subtle)', marginLeft: 14 }}>
                          {(['idea', 'requirements', 'design', 'tests', 'build'] as Stage[]).map((s) => nav(`/p/${p.id}/f/${f.id}/${s}`, <><span className={`chip ${STAGE_INFO[s].cls}`} style={{ padding: '0 6px', minWidth: 18, justifyContent: 'center' }}>{st[s].done ? '✓' : STAGES.indexOf(s) + 1}</span>{STAGE_INFO[s].name}</>, fsub === s))}
                        </nav>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}
          <nav className="nav" style={{ marginTop: 'auto' }}>
            {nav('/connect', <>Connections {settings.githubUser ? <span className="badge tone-success" style={{ marginLeft: 'auto' }}>@{settings.githubUser}</span> : <span className="badge tone-warning" style={{ marginLeft: 'auto' }}>demo</span>}</>, parts[0] === 'connect')}
          </nav>
          <div className="row gap-sm between">
            <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }} value={settings.role} onChange={(e) => store.setSettings({ role: e.target.value as typeof settings.role })} aria-label="Your role">
              {[['PO', 'Product Owner'], ['BA', 'Business Analyst'], ['DM', 'Delivery Manager'], ['UX', 'Designer'], ['Dev', 'Developer'], ['QA', 'QA'], ['Ops', 'Ops']].map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="seg" role="group" aria-label="Theme">
              <button aria-pressed={settings.theme === 'light'} onClick={() => store.setSettings({ theme: 'light' })}>Light</button>
              <button aria-pressed={settings.theme === 'dark'} onClick={() => store.setSettings({ theme: 'dark' })}>Dark</button>
            </div>
          </div>
        </aside>
        <main className="main">{page}</main>
      </div>
      <Toaster />
    </>
  );
}
