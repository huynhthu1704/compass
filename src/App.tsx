import { useEffect, useState } from 'react';
import { ArchitecturePage } from './pages/Architecture';
import { BuildPage } from './pages/Build';
import { ConnectPage } from './pages/Connect';
import { IdeaPage } from './pages/Idea';
import { ImportPage } from './pages/Import';
import { ProjectSettingsPage } from './pages/ProjectSettings';
import { NewProjectPage } from './pages/NewProject';
import { Onboarding } from './pages/Onboarding';
import { OverviewPage } from './pages/Overview';
import { ProjectsPage } from './pages/Projects';
import { ReleasePage } from './pages/Release';
import { TeamPage } from './pages/Team';
import { DesignPage } from './pages/Design';
import { RequirementsPage } from './pages/Requirements';
import { RunPage, RunsPage } from './pages/Runs';
import { TestsPage } from './pages/Tests';
import { TeamFloorPage } from './pages/TeamFloor';
import { syncLabel, useSync } from './autosync';
import { FeaturePage } from './pages/Feature';
import { store, useStore } from './store';
import { pickedRoles } from './types';
import { Toaster } from './ui';
import { Sidebar } from './components/Sidebar';
import { canSeeProject, firebaseEnabled, getSession, leaveDemo, startSession, useSession, useWorkspace } from './firebase';
import { tokenFor } from './token';
import { NoAccessPage, SignInPage } from './pages/SignIn';
import { canOpenConnections, leavesDemoOnNavigate, routeOf, startScreen } from './team';

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
  useEffect(() => { void startSession(); }, []);
  // REQ-040 AC4, ADR-026: the browser Back button on the demo role screen leaves the demo instead of trapping the person.
  useEffect(() => {
    const on = () => { const s = getSession(); if (leavesDemoOnNavigate({ demo: s.demo, hasRole: pickedRoles(store.get().settings).length > 0, entry: s.demoEntry, route: routeOf(window.location.hash) })) leaveDemo(); };
    window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on);
  }, []);
  const session = useSession();
  useWorkspace(); // F-015 REQ-041: re-render when the shared work token arrives, so the sync label and GitHub actions use it

  const routeProject = parts[0] === 'p' ? parts[1] : undefined;
  const sync = useSync(routeProject); // hooks must run before any early return
  // F-015: with Firebase configured, people sign in with Google and their roles come from the team (REQ-032).
  // REQ-039/040: with sign-in on, roles come from the team; the role screen appears only inside the demo.
  const screen = startScreen({ firebase: firebaseEnabled, status: session.status, demo: !!session.demo, hasRole: pickedRoles(settings).length > 0, hasAccess: session.superAdmin || session.access.length > 0 });
  if (screen === 'loading') return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><span className="body t-secondary">Loading…</span></main>;
  if (screen === 'sign-in') return <><SignInPage logo={<Logo />} error={session.error} /><Toaster /></>;
  if (screen === 'no-access') return <><NoAccessPage logo={<Logo />} email={session.email} error={session.error} /><Toaster /></>;
  if (screen === 'role-picker') return <><Onboarding /><Toaster /></>;

  const p = parts[0] === 'p' ? state.projects.find((x) => x.id === parts[1] && canSeeProject(x, session)) : undefined;
  const sub = parts[2] || '';
  let page;
  // REQ-040 AC3: the demo never creates or imports real repositories.
  if (session.demo && ['new', 'import'].includes(parts[0])) page = <ProjectsPage />;
  // REQ-041 AC2: with sign-in on, Connections is only for super admins; anyone else lands on Projects.
  else if (parts[0] === 'connect') page = canOpenConnections({ signedIn: session.status === 'signed-in', demo: !!session.demo, superAdmin: session.superAdmin }) ? <ConnectPage /> : <ProjectsPage />;
  else if (parts[0] === 'new') page = <NewProjectPage />;
  else if (parts[0] === 'import') page = <ImportPage />;
  else if (parts[0] === 'architecture') page = <ArchitecturePage />;
  else if (p && sub === 'f' && parts[3]) {
    const fid = parts[3], fs = parts[4] || '';
    page = fs === 'idea' ? <IdeaPage p={p} fid={fid} /> : fs === 'requirements' ? <RequirementsPage p={p} fid={fid} /> : fs === 'design' ? <DesignPage p={p} fid={fid} /> : fs === 'tests' ? <TestsPage p={p} fid={fid} />
      : fs === 'build' ? <BuildPage p={p} fid={fid} /> : <FeaturePage p={p} fid={fid} />;
  } else if (p) {
    page = sub === 'floor' ? <TeamFloorPage p={p} /> : sub === 'team' ? <TeamPage key={p.id} p={p} /> : sub === 'release' ? <ReleasePage p={p} /> : sub === 'settings' ? <ProjectSettingsPage p={p} />
      : sub === 'runs' && parts[3] ? <RunPage p={p} rid={parts[3]} /> : sub === 'runs' ? <RunsPage p={p} /> : <OverviewPage p={p} />;
  } else page = <ProjectsPage />;

  const sl = p && p.repo && !p.demo && tokenFor(p) ? syncLabel(sync, p.dirty) : null;

  return (
    <>
      <div className="mobile-top"><div className="brand"><Logo />Compass</div><button className="btn secondary sm" onClick={() => setMenu(!menu)} aria-expanded={menu}>Menu</button></div>
      <div className="app">
        <aside className={`sidebar ${menu ? 'open' : ''}`}>
          <Sidebar parts={parts} p={p} sync={sl ? { ...sl, title: sync?.message } : null} logo={<Logo />} />
        </aside>
        <main className="main">
          {session.demo && (
            <div className="row gap-md wrap" role="status" style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 12, background: 'var(--color-bg-brand-subtle)', border: '1px solid var(--color-border-brand)', alignItems: 'center' }}>
              <span className="stack grow"><strong className="body-sm">Demo — sample data, kept in this browser only</strong><span className="body-sm t-secondary">Nothing here is saved to GitHub or Firebase. Your real projects are not shown while you are in the demo.</span></span>
              <button className="btn secondary sm" onClick={() => { leaveDemo(); go('/'); }}>Leave demo</button>
            </div>
          )}
          {page}
        </main>
      </div>
      <Toaster />
    </>
  );
}
