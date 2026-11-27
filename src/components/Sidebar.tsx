// F-013 Sidebar navigation (REQ-070 … REQ-073) — design: compass/design/F-013.md
import type { ReactNode } from 'react';
import { go } from '../App';
import { featureStage, stageStatus } from '../progress';
import { accountCard, featureRows, projectLinks, projectState, themeToggle, WORKSPACE_LINKS, type NavLink, type Tone } from '../sidebar';
import { store, useStore } from '../store';
import { STAGES, type Project, type Stage } from '../types';
import { STAGE_INFO } from '../ui';

// Stroke icons on a 24×24 grid in currentColor, so they follow the theme tokens.
const PATHS = {
  projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  architecture: 'M12 3v4M12 17v4M5 12H3m18 0h-2M7 7h10v10H7zM10 10h4v4h-4z',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z',
  floor: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5m0-4.6c.6-.3 1.3-.4 2-.4 3 0 6 2 6 5',
  release: 'M5 15c-1 1-2 4-2 6 2 0 5-1 6-2m-4-4 4 4m-4-4 3-3 4 4-3 3m-4-4c2-6 7-11 15-12-1 8-6 13-12 15',
  runs: 'M5 4l14 8-14 8z',
  chevron: 'M9 6l6 6-6 6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
};
const Icon = ({ name, size = 18 }: { name: keyof typeof PATHS; size?: number }) => (
  <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={PATHS[name]} /></svg>
);

const ROLES: [string, string][] = [['PO', 'Product Owner'], ['BA', 'Business Analyst'], ['DM', 'Delivery Manager'], ['UX', 'Designer'], ['Dev', 'Developer'], ['QA', 'QA'], ['Ops', 'Ops']];
const toneText = (t: Tone) => ({ success: 't-success', danger: 't-danger', warning: 't-accent', info: 't-tertiary', neutral: 't-tertiary' })[t];
const stageName = (s: Stage | 'done') => (s === 'done' ? 'Done' : STAGE_INFO[s].name);

type Props = { parts: string[]; p?: Project; sync: { tone: Tone; text: string; title?: string } | null; logo: ReactNode };

export function Sidebar({ parts, p, sync, logo }: Props) {
  const { settings } = useStore();
  const sub = parts[2] || '';
  const openId = sub === 'f' ? parts[3] : undefined;
  const fsub = parts[4] || '';
  const account = accountCard(settings.githubUser);
  const theme = themeToggle(settings.theme);

  const link = (l: NavLink, current: boolean) => (
    <button key={l.path} aria-current={current ? 'page' : undefined} onClick={() => go(l.path)} title={l.title}>
      <Icon name={l.icon} /><span className="nav-label">{l.label}</span>
      {l.count && <span className="nav-count" aria-label={l.count.label}>{l.count.n}</span>}
    </button>
  );

  return (
    <>
      <div className="brand">{logo}<div className="brand-text">Compass</div></div>

      <nav className="nav" aria-label="Workspace">
        {link(WORKSPACE_LINKS[0], !p && !['connect', 'architecture'].includes(parts[0]))}
        {link(WORKSPACE_LINKS[1], parts[0] === 'architecture')}
      </nav>

      {p && <ProjectGroup p={p} sync={sync} sub={sub} openId={openId} fsub={fsub} link={link} />}

      <div className="sidebar-footer">
        <button className="side-card" aria-current={parts[0] === 'connect' ? 'page' : undefined} onClick={() => go('/connect')}>
          <span className="side-avatar round" aria-hidden>{account.initial}</span>
          <span className="side-meta">
            <span className="side-name">{account.name}</span>
            <span className={`side-state ${toneText(account.tone)}`}><span className="status-dot" aria-hidden />{account.state}</span>
          </span>
          <Icon name="chevron" size={16} />
        </button>
        <div className="row gap-sm">
          <select className="select role-select" value={settings.role} onChange={(e) => store.setSettings({ role: e.target.value as typeof settings.role })} aria-label="Your role">
            {ROLES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="icon-btn" onClick={() => store.setSettings({ theme: theme.next })} aria-label={theme.label} title={theme.label}><Icon name={theme.icon} /></button>
        </div>
      </div>
    </>
  );
}

function ProjectGroup({ p, sync, sub, openId, fsub, link }: { p: Project; sync: Props['sync']; sub: string; openId?: string; fsub: string; link: (l: NavLink, current: boolean) => ReactNode }) {
  const state = projectState(p, sync);
  const rows = featureRows(p.spec.features, openId, (id) => featureStage(p, id), stageName);
  return (
    <section className="nav-section" aria-label={`Project ${p.name}`}>
      <button className="side-card" onClick={() => go('/')} title="All projects">
        <span className="side-avatar" aria-hidden>{p.name.slice(0, 1).toUpperCase()}</span>
        <span className="side-meta">
          <span className="side-name">{p.name}</span>
          <span className={`side-state ${toneText(state.tone)}`} title={sync?.title}><span className="status-dot" aria-hidden />{state.text}</span>
        </span>
        <Icon name="chevron" size={16} />
      </button>
      <nav className="nav" aria-label="Project">
        {projectLinks(p.id, p.runs).map((l) => link(l, sub === l.key))}
      </nav>
      {rows.length > 0 && (
        <>
          <div className="nav-heading"><span className="overline">Features</span><span className="nav-heading-count" aria-label={`${rows.length} features`}>{rows.length}</span></div>
          <nav className="nav nav-features" aria-label="Features">
            {rows.map((f) => {
              const open = openId === f.id;
              const st = open ? stageStatus(p, f.id) : null;
              return (
                <div key={f.id} className="stack">
                  <button aria-current={open && fsub === '' ? 'page' : undefined} onClick={() => go(`/p/${p.id}/f/${f.id}`)} title={f.title}>
                    <span className={`feature-dot ${f.stage === 'done' ? 'tone-success' : STAGE_INFO[f.stage].cls}`} aria-hidden />
                    <span className="nav-label">{f.name}</span>
                    <span className="feature-id">{f.short}</span>
                  </button>
                  {st && (
                    <nav className="nav nav-stages" aria-label={`${f.id} stages`}>
                      {(['idea', 'requirements', 'design', 'tests', 'build'] as Stage[]).map((s) => (
                        <button key={s} aria-current={fsub === s ? 'page' : undefined} onClick={() => go(`/p/${p.id}/f/${f.id}/${s}`)}>
                          <span className={`stage-step ${STAGE_INFO[s].cls}`} aria-hidden>{st[s].done ? '✓' : STAGES.indexOf(s) + 1}</span>
                          <span className="nav-label">{STAGE_INFO[s].name}{st[s].done && <span className="sr-only"> (done)</span>}</span>
                        </button>
                      ))}
                    </nav>
                  )}
                </div>
              );
            })}
          </nav>
        </>
      )}
    </section>
  );
}
