import { useEffect, useState } from 'react';
import { ROLE_INFO } from './catalog';
import { alertState } from './engine';
import { useT } from './i18n';
import { ActionsPage } from './pages/Actions';
import { ArtefactPage, ArtefactsPage } from './pages/Artefacts';
import { BacklogPage } from './pages/Backlog';
import { KnowledgePage } from './pages/Knowledge';
import { MonitorPage } from './pages/Monitor';
import { NewProject } from './pages/NewProject';
import { Onboarding } from './pages/Onboarding';
import { OverviewPage } from './pages/Overview';
import { ProjectsPage } from './pages/Projects';
import { ReleasePage } from './pages/Release';
import { SettingsPage } from './pages/Settings';
import { TracePage } from './pages/Trace';
import { store, useStore } from './store';
import { Toaster } from './ui';

export const go = (path: string) => { window.location.hash = path; window.scrollTo(0, 0); };
export const query = () => new URLSearchParams(window.location.hash.split('?')[1] || '');

function useRoute() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => setHash(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.split('?')[0].split('/').filter(Boolean);
}

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="var(--color-bg-brand)" /><path d="M16 6l4 10-4 10-4-10z" fill="#F5B544" /><circle cx="16" cy="16" r="2" fill="#fff" /></svg>
);

export default function App() {
  const state = useStore();
  const { settings } = state;
  const t = useT();
  const parts = useRoute();
  const [menu, setMenu] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = settings.theme; document.documentElement.lang = settings.lang; }, [settings.theme, settings.lang]);
  useEffect(() => setMenu(false), [parts.join('/')]);

  if (!settings.role) return <><Onboarding /><Toaster /></>;

  const pid = parts[0] === 'p' ? parts[1] : undefined;
  const project = pid ? state.projects.find((p) => p.id === pid) : undefined;
  const sub = parts[2] || '';
  const alert = project ? alertState(project) : null;

  let page;
  if (parts[0] === 'new') page = <NewProject />;
  else if (parts[0] === 'knowledge') page = <KnowledgePage />;
  else if (parts[0] === 'settings') page = <SettingsPage />;
  else if (project) {
    if (sub === 'actions') page = <ActionsPage p={project} />;
    else if (sub === 'artefacts') page = <ArtefactsPage p={project} />;
    else if (sub === 'a') page = <ArtefactPage p={project} id={parts[3]} />;
    else if (sub === 'backlog') page = <BacklogPage p={project} />;
    else if (sub === 'release') page = <ReleasePage p={project} />;
    else if (sub === 'monitor') page = <MonitorPage p={project} />;
    else if (sub === 'trace') page = <TracePage p={project} />;
    else page = <OverviewPage p={project} />;
  } else page = <ProjectsPage />;

  const nav = (path: string, label: string, current: boolean, extra?: React.ReactNode) => (
    <button aria-current={current ? 'page' : undefined} onClick={() => go(path)}>{label}{extra}</button>
  );

  return (
    <>
      <div className="mobile-top">
        <div className="brand"><Logo />Compass</div>
        <button className="btn secondary sm" onClick={() => setMenu(!menu)} aria-expanded={menu}>Menu</button>
      </div>
      <div className="app">
        <aside className={`sidebar ${menu ? 'open' : ''}`}>
          <div className="brand"><Logo />Compass</div>
          <nav className="nav">
            {nav('/', t('Projects'), !pid && parts[0] !== 'knowledge' && parts[0] !== 'settings' && parts[0] !== 'new')}
          </nav>
          {project && (
            <div className="nav-group">
              <div className="overline t-tertiary" style={{ padding: '0 12px' }}>{project.name}</div>
              <nav className="nav">
                {nav(`/p/${project.id}`, t('Overview'), sub === '')}
                {nav(`/p/${project.id}/actions`, t('Next actions'), sub === 'actions')}
                {nav(`/p/${project.id}/artefacts`, t('Artefacts'), sub === 'artefacts' || sub === 'a', <span className="t-tertiary mono-sm" style={{ marginLeft: 'auto' }}>{project.artefacts.length}</span>)}
                {nav(`/p/${project.id}/backlog`, t('Backlog'), sub === 'backlog', <span className="t-tertiary mono-sm" style={{ marginLeft: 'auto' }}>{project.stories.length}</span>)}
                {nav(`/p/${project.id}/release`, t('Plan & Release'), sub === 'release')}
                {nav(`/p/${project.id}/monitor`, t('Monitor'), sub === 'monitor', alert ? <span className="badge tone-danger" style={{ marginLeft: 'auto' }}>!</span> : null)}
                {nav(`/p/${project.id}/trace`, t('Traceability'), sub === 'trace')}
              </nav>
            </div>
          )}
          <nav className="nav" style={{ marginTop: 'auto' }}>
            {nav('/knowledge', t('Knowledge'), parts[0] === 'knowledge')}
            {nav('/settings', t('Settings'), parts[0] === 'settings')}
          </nav>
          <div className="stack gap-sm">
            <div className="row gap-sm between">
              <span className="label-sm t-tertiary">{t('Role')}</span>
              <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }} value={settings.role} onChange={(e) => store.setSettings({ role: e.target.value as typeof settings.role })}>
                {Object.entries(ROLE_INFO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
            <div className="row gap-sm between">
              <div className="seg" role="group" aria-label="Language">
                <button aria-pressed={settings.lang === 'en'} onClick={() => store.setSettings({ lang: 'en' })}>EN</button>
                <button aria-pressed={settings.lang === 'vi'} onClick={() => store.setSettings({ lang: 'vi' })}>VI</button>
              </div>
              <div className="seg" role="group" aria-label="Theme">
                <button aria-pressed={settings.theme === 'light'} onClick={() => store.setSettings({ theme: 'light' })}>Light</button>
                <button aria-pressed={settings.theme === 'dark'} onClick={() => store.setSettings({ theme: 'dark' })}>Dark</button>
              </div>
            </div>
          </div>
        </aside>
        <main className="main">{page}</main>
      </div>
      <Toaster />
    </>
  );
}
