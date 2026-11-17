import { useEffect, useState } from 'react';
import { ROLE_INFO } from './catalog';
import { alertState } from './engine';
import { useT } from './i18n';
import { ActionsPage } from './pages/Actions';
import { ArtefactPage, ArtefactsPage } from './pages/Artefacts';
import { BacklogPage } from './pages/Backlog';
import { KnowledgePage } from './pages/Knowledge';
import { MonitorPage } from './pages/Monitor';
import { AskPage } from './pages/Ask';
import { NewProduct } from './pages/NewProduct';
import { NewProject } from './pages/NewProject';
import { ProductHome } from './pages/ProductHome';
import { ProductKnowledge } from './pages/ProductKnowledge';
import { ProductsPage } from './pages/Products';
import { Onboarding } from './pages/Onboarding';
import { OverviewPage } from './pages/Overview';
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
  const prodId = parts[0] === 'prod' ? parts[1] : project?.productId;
  const product = prodId ? state.products.find((p) => p.id === prodId) : undefined;
  const sub = parts[2] || '';
  const psub = parts[0] === 'prod' ? sub : '';
  const alert = project ? alertState(project) : null;
  const inits = product ? state.projects.filter((p) => p.productId === product.id) : [];

  let page;
  if (parts[0] === 'new-product') page = <NewProduct />;
  else if (parts[0] === 'knowledge') page = <KnowledgePage />;
  else if (parts[0] === 'settings') page = <SettingsPage />;
  else if (parts[0] === 'prod' && product) {
    if (sub === 'new') page = <NewProject prod={product} key={product.id} />;
    else if (sub === 'knowledge') page = <ProductKnowledge prod={product} />;
    else if (sub === 'ask') page = <AskPage prod={product} key={window.location.hash} />;
    else page = <ProductHome prod={product} />;
  } else if (project) {
    if (sub === 'actions') page = <ActionsPage p={project} />;
    else if (sub === 'artefacts') page = <ArtefactsPage p={project} />;
    else if (sub === 'a') page = <ArtefactPage p={project} id={parts[3]} />;
    else if (sub === 'backlog') page = <BacklogPage p={project} />;
    else if (sub === 'release') page = <ReleasePage p={project} />;
    else if (sub === 'monitor') page = <MonitorPage p={project} />;
    else if (sub === 'trace') page = <TracePage p={project} />;
    else page = <OverviewPage p={project} />;
  } else page = <ProductsPage />;

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
            {nav('/', t('Products'), !product && !['knowledge', 'settings'].includes(parts[0]))}
          </nav>
          {product && (
            <div className="nav-group">
              <div className="overline t-tertiary" style={{ padding: '0 12px' }}>{product.name}</div>
              <nav className="nav">
                {nav(`/prod/${product.id}`, t('Product home'), parts[0] === 'prod' && psub === '')}
                {nav(`/prod/${product.id}/knowledge`, t('Knowledge base'), psub === 'knowledge', <span className="t-tertiary mono-sm" style={{ marginLeft: 'auto' }}>{product.docs.length}</span>)}
                {nav(`/prod/${product.id}/ask`, t('Ask product'), psub === 'ask')}
                {nav(`/prod/${product.id}/new`, '+ ' + t('New initiative'), psub === 'new')}
              </nav>
              {inits.length > 0 && <div className="overline t-tertiary" style={{ padding: '8px 12px 0' }}>{t('Initiatives')}</div>}
              <nav className="nav">
                {inits.map((i) => (
                  <div key={i.id} className="stack">
                    {nav(`/p/${i.id}`, i.name, project?.id === i.id && sub === '', alertState(i) ? <span className="badge tone-danger" style={{ marginLeft: 'auto' }}>!</span> : null)}
                    {project?.id === i.id && (
                      <nav className="nav" style={{ paddingLeft: 12, borderLeft: '1px solid var(--color-border-subtle)', marginLeft: 12 }}>
                        {nav(`/p/${i.id}/actions`, t('Next actions'), sub === 'actions')}
                        {nav(`/p/${i.id}/artefacts`, t('Artefacts'), sub === 'artefacts' || sub === 'a', <span className="t-tertiary mono-sm" style={{ marginLeft: 'auto' }}>{i.artefacts.length}</span>)}
                        {nav(`/p/${i.id}/backlog`, t('Backlog'), sub === 'backlog', <span className="t-tertiary mono-sm" style={{ marginLeft: 'auto' }}>{i.stories.length}</span>)}
                        {nav(`/p/${i.id}/release`, t('Plan & Release'), sub === 'release')}
                        {nav(`/p/${i.id}/monitor`, t('Monitor'), sub === 'monitor', alert ? <span className="badge tone-danger" style={{ marginLeft: 'auto' }}>!</span> : null)}
                        {nav(`/p/${i.id}/trace`, t('Traceability'), sub === 'trace')}
                      </nav>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          )}
          <nav className="nav" style={{ marginTop: 'auto' }}>
            {nav('/knowledge', t('BABOK library'), parts[0] === 'knowledge')}
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
