// F-013 Sidebar navigation (REQ-070 … REQ-073) — design: compass/design/F-013.md
// REQ-110: the footer is one account card with an account menu — design: compass/design/2026-11-28-account-menu.md
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { exitDemo, go } from '../App';
import { featureStage, stageStatus } from '../progress';
import { projectKey, signOut, useSession, useWorkspace } from '../firebase';
import { canOpenConnections } from '../team';
import { accountCard, accountChips, accountMenu, accountName, featureRows, projectLinks, projectState, settingsLink, signedInCard, teamLink, themeToggle, WORKSPACE_LINKS, type NavLink, type Tone } from '../sidebar';
import { store, useStore } from '../store';
import { pickedRoles, ROLE_ORDER, STAGES, toggleRole, type Project, type Role, type Stage } from '../types';
import { STAGE_INFO } from '../ui';

// Stroke icons on a 24×24 grid in currentColor, so they follow the theme tokens.
const PATHS = {
  projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  architecture: 'M12 3v4M12 17v4M5 12H3m18 0h-2M7 7h10v10H7zM10 10h4v4h-4z',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v7h-4z',
  floor: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5m0-4.6c.6-.3 1.3-.4 2-.4 3 0 6 2 6 5',
  release: 'M5 15c-1 1-2 4-2 6 2 0 5-1 6-2m-4-4 4 4m-4-4 3-3 4 4-3 3m-4-4c2-6 7-11 15-12-1 8-6 13-12 15',
  runs: 'M5 4l14 8-14 8z',
  team: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-1a6 6 0 0 1 12 0v1m3-11 2 2 4-4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  chevron: 'M9 6l6 6-6 6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  exit: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
};
const Icon = ({ name, size = 18 }: { name: keyof typeof PATHS; size?: number }) => (
  <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={PATHS[name]} /></svg>
);

const ROLE_NAMES: Record<Role, string> = { PO: 'Product Owner', BA: 'Business Analyst', DM: 'Delivery Manager', UX: 'Designer', Dev: 'Developer', QA: 'QA', Ops: 'Ops' };
const toneText = (t: Tone) => ({ success: 't-success', danger: 't-danger', warning: 't-accent', info: 't-tertiary', neutral: 't-tertiary' })[t];
const stageName = (s: Stage | 'done') => (s === 'done' ? 'Done' : STAGE_INFO[s].name);

type Props = { parts: string[]; p?: Project; sync: { tone: Tone; text: string; title?: string } | null; logo: ReactNode };

export function Sidebar({ parts, p, sync, logo }: Props) {
  const { settings } = useStore();
  const sub = parts[2] || '';
  const openId = sub === 'f' ? parts[3] : undefined;
  const fsub = parts[4] || '';
  const session = useSession();
  const signedIn = session.status === 'signed-in' && !!session.email;
  const account = signedIn ? signedInCard(session.email!, session.superAdmin) : accountCard(settings.githubUser);
  // F-015: the Team item for the super admin and Admins of this project (only when sign-in is on).
  const myRoles = p?.repo ? session.access.find((a) => a.id === projectKey(p.repo!))?.roles || [] : [];
  const canManageTeam = !!p?.repo && signedIn && (session.superAdmin || !!session.access.find((a) => a.id === projectKey(p.repo!))?.roles.includes('Admin'));
  const theme = themeToggle(settings.theme);
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLButtonElement>(null);
  const name = signedIn ? accountName(session.email!) : account.name;
  const roles = pickedRoles(settings);
  const chips = accountChips({ signedIn, demo: session.demo, superAdmin: session.superAdmin, roles: myRoles, demoRole: roles.join(', ') || undefined }); // REQ-121: "Demo · PO, BA"
  // REQ-110 AC2 as amended by ADR-020 and ADR-027: with sign-in on, Connections is only in super admins' menu (REQ-041 AC2), and never in the demo.
  const ws = useWorkspace();
  // Signed in, Connections is the shared page: its hint is the work token, not this device's token (the demo has no Connections).
  const connHint = signedIn ? (ws?.workToken ? 'Work token ✓' : 'No work token') : settings.githubUser ? 'GitHub ✓' : 'Not connected';
  const items = accountMenu({ signedIn, demo: session.demo }).filter((it) => it !== 'connections' || canOpenConnections({ signedIn, demo: !!session.demo, superAdmin: session.superAdmin }));
  // REQ-110 AC3: choosing an item closes the menu and returns focus to the card, then acts.
  const choose = (act: () => void) => () => { setOpen(false); cardRef.current?.focus(); act(); };

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

      {p && <ProjectGroup p={p} sync={sync} sub={sub} openId={openId} fsub={fsub} link={link} team={canManageTeam} />}

      <div className="sidebar-footer">
        {(!signedIn || session.demo) && <div className="row gap-sm account-role"><RolesPicker label={session.demo ? 'Demo roles' : 'Roles'} roles={roles} /></div>}
        {/* REQ-110: Escape closes the menu from anywhere in the card or menu (also after Shift+Tab back to the card) */}
        <AccountMenu open={open} setOpen={setOpen} onKeyDown={(e) => { if (open && e.key === 'Escape') { setOpen(false); cardRef.current?.focus(); } }}>
          <button ref={cardRef} className="side-card account-card" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} title={signedIn ? session.email : account.name}>
            <span className="side-avatar round account-avatar" aria-hidden>{account.initial}</span>
            <span className="side-meta">
              <span className="side-name">{name}</span>
              {chips.length
                ? <span className="account-chips">{chips.map((c) => <span key={c.label} className={`account-chip ${c.tone}`}>{c.label}</span>)}</span>
                : <span className={`side-state ${toneText(account.tone)}`}><span className="status-dot" aria-hidden />{account.state}</span>}
            </span>
            <Icon name="more" size={18} />
          </button>
          {open && (
            <div className="account-menu" onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') moveFocus(e); }}>
              {/* the header is not a menu item, so it sits beside role="menu"; tabIndex -1 keeps focus inside when it is clicked */}
              <div className="account-menu-head" tabIndex={-1}><strong>{name}</strong><span>{signedIn ? <>{session.email!.split('@')[0]}@<wbr />{session.email!.split('@').slice(1).join('@')}</> : account.state}</span></div>
              <div className="account-menu-items" role="menu" aria-label="Account">
              {items.map((it) => it === 'connections'
                ? <button key={it} role="menuitem" onClick={choose(() => go('/connect'))}><Icon name="link" size={16} />Connections<span className="account-menu-hint">{connHint}</span></button>
                : it === 'theme'
                  ? <button key={it} role="menuitemcheckbox" aria-checked={settings.theme === 'dark'} title={theme.label} onClick={choose(() => store.setSettings({ theme: theme.next }))}><Icon name="moon" size={16} />Dark theme<span className="account-switch" aria-hidden /></button>
                  : it === 'leave-demo'
                    ? <button key={it} role="menuitem" onClick={choose(exitDemo)}><Icon name="exit" size={16} />Leave demo</button>
                    : <button key={it} role="menuitem" className="account-menu-danger" onClick={choose(() => void signOut())}><Icon name="exit" size={16} />Sign out</button>)}
              </div>
            </div>
          )}
        </AccountMenu>
      </div>
    </>
  );
}

function ProjectGroup({ p, sync, sub, openId, fsub, link, team }: { p: Project; sync: Props['sync']; sub: string; openId?: string; fsub: string; link: (l: NavLink, current: boolean) => ReactNode; team: boolean }) {
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
        {team && link(teamLink(p.id), sub === 'team')}
        {link(settingsLink(p.id), sub === 'settings')}
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

/** REQ-121: the picked roles as a checkbox menu ("Demo roles: PO, BA ▾"); the last ticked role cannot be unticked.
 *  A <details> disclosure: Enter/Space opens it, Escape or a click outside closes it. */
function RolesPicker({ label, roles }: { label: string; roles: Role[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    // On click, not pointerdown: closing first would shift the account card out from under a tap on a phone.
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false; };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  const text = roles.join(', ') || 'none';
  return (
    <details ref={ref} className="grow" style={{ minWidth: 0 }} onToggle={(e) => setOpen(e.currentTarget.open)}
      onKeyDown={(e) => { if (e.key === 'Escape' && ref.current?.open) { e.stopPropagation(); ref.current.open = false; ref.current.querySelector('summary')?.focus(); } }}>
      <summary className="row gap-sm" style={{ listStyle: 'none', cursor: 'pointer', alignItems: 'center' }} aria-label={`${label}: ${text}`}>
        <span className="body-sm t-secondary">{label}</span>
        <span className="select role-select" style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}><span>{text}</span><span aria-hidden>▾</span></span>
      </summary>
      <fieldset className="stack gap-xs" style={{ border: 0, margin: 0, padding: 'var(--spacing-sm) var(--spacing-xs) 0' }}>
        <legend className="sr-only">{label}</legend>
        {ROLE_ORDER.map((r) => {
          const on = roles.includes(r);
          return (
            <label key={r} className="row gap-sm body-sm" style={{ alignItems: 'center', cursor: on && roles.length === 1 ? 'default' : 'pointer' }} title={on && roles.length === 1 ? 'Keep at least one role' : undefined}>
              <input type="checkbox" checked={on} disabled={on && roles.length === 1} onChange={() => store.setSettings({ roles: toggleRole(roles, r, true), role: undefined })} />
              <span className="mono t-brand" style={{ minWidth: 32 }}>{r}</span><span>{ROLE_NAMES[r]}</span>
            </label>
          );
        })}
      </fieldset>
    </details>
  );
}

/** REQ-110: the footer's account card and its menu; a click outside closes the menu, and it opens with focus on the first item. */
function AccountMenu({ open, setOpen, onKeyDown, children }: { open: boolean; setOpen: (v: boolean) => void; onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open, setOpen]);
  // Tab (or any focus move) out of the card and menu closes it; a click outside is the pointerdown above.
  return <div ref={ref} className="account" onKeyDown={onKeyDown} onBlur={(e) => { if (open && e.relatedTarget && !ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>{children}</div>;
}

/** REQ-110: arrow keys move between the menu items; from the header (not an item), ArrowDown goes to the first and ArrowUp to the last. */
function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  e.preventDefault();
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
  const i = items.indexOf(document.activeElement as HTMLElement);
  const down = e.key === 'ArrowDown';
  items[i < 0 ? (down ? 0 : items.length - 1) : (i + (down ? 1 : -1) + items.length) % items.length]?.focus();
}
