// F-015 SCR-3 / SCR-6 Team page (REQ-030, REQ-031, REQ-035, REQ-038 AC1). Design: compass/design/F-015.md.
// The super admin creates a project's first team (with its approval baseline); Admins add people with one or more
// roles, change roles and remove people. The project GitHub token card (REQ-034) comes with the next step.
import { useEffect, useState } from 'react';
import { createFirstTeam, loadTeam, projectKey, saveTeam, useSession } from '../firebase';
import { addMember, baselineFrom, LAST_ADMIN, removeMember, setRoles, TEAM_ROLES, teamDoc, type Member, type TeamResult, type TeamRole } from '../team';
import type { Project } from '../types';
import { Badge, Button, PageHead } from '../ui';

function RoleBoxes({ value, onChange, name }: { value: TeamRole[]; onChange: (r: TeamRole[]) => void; name: string }) {
  return (
    <fieldset className="row gap-sm wrap" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="body-sm" style={{ fontWeight: 500, marginBottom: 8 }}>Roles (one or more)</legend>
      {TEAM_ROLES.map((r) => (
        <label key={r} className="row gap-xs" style={{ border: '1px solid var(--color-border-default)', borderRadius: 999, padding: '6px 12px', background: value.includes(r) ? 'var(--color-bg-brand-subtle)' : 'var(--color-bg-surface)' }}>
          <input type="checkbox" name={name} checked={value.includes(r)} onChange={(e) => onChange(e.target.checked ? [...value, r] : value.filter((x) => x !== r))} />
          <span className="body-sm">{r}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function TeamPage({ p }: { p: Project }) {
  const session = useSession();
  const key = p.repo ? projectKey(p.repo) : '';
  const myRoles = session.access.find((a) => a.id === key)?.roles || [];
  const canManage = session.superAdmin || myRoles.includes('Admin');
  const [team, setTeam] = useState<Member[] | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [roles, setRolesNew] = useState<TeamRole[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<TeamRole[]>([]);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!key || session.status !== 'signed-in') { setLoading(false); return; }
    let on = true;
    loadTeam(key).then((t) => { if (!on) return; setTeam(t?.members || []); setExists(!!t); })
      .catch((e) => on && setMsg({ tone: 'danger', text: `Could not load the team: ${(e as Error).message}` }))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [key, session.status]);

  if (session.status !== 'signed-in') return <PageHead over={`${p.name} · Team`} title="Team" sub="Sign in with Google to manage the team." />;
  if (!p.repo) return <PageHead over={`${p.name} · Team`} title="Team" sub="A team needs a GitHub repository. Local and demo projects have no team." />;
  if (!canManage) return <PageHead over={`${p.name} · Team`} title="Team" sub="Only Admins of this project and the super admin can manage its team." />;

  /** Saves a changed team; the first save (super admin only) creates the team with its approval baseline. */
  const commit = async (r: TeamResult, done: string, removedEmail?: string) => {
    if (!r.ok) { setMsg({ tone: 'danger', text: r.error }); return false; }
    if (!r.team.some((m) => m.roles.includes('Admin'))) { setMsg({ tone: 'danger', text: exists ? LAST_ADMIN : 'Tick Admin for at least one person: a new team needs an Admin.' }); return false; }
    setBusy(true); setMsg(null);
    try {
      const doc = teamDoc(p.name, p.repo!, r.team);
      if (exists) await saveTeam(key, doc);
      else await createFirstTeam(key, doc, baselineFrom(p.spec));
      setTeam(r.team); setExists(true); setMsg({ tone: 'success', text: done }); setRemoved(removedEmail || null);
      return true;
    } catch (e) {
      setMsg({ tone: 'danger', text: `Not saved: ${(e as Error).message}` });
      return false;
    } finally { setBusy(false); }
  };

  const add = async () => {
    const r = addMember(team || [], email, roles);
    if (await commit(r, r.ok ? `${r.team[r.team.length - 1].email} added.` : '')) { setEmail(''); setRolesNew([]); }
  };

  return (
    <div className="stack gap-xl" style={{ maxWidth: 980 }}>
      <PageHead over={`${p.name} · Team`} title="Team" sub="People who can open this project and the gates their roles can pass. Only Admins and the super admin see this page." />

      {msg && <div style={{ padding: '12px 16px' }} className={`card body-sm ${msg.tone === 'danger' ? 't-danger' : 't-success'}`} role={msg.tone === 'danger' ? 'alert' : 'status'}>{msg.text}</div>}
      {removed && (
        <div className="card stack gap-xs" style={{ padding: '12px 16px', background: 'var(--color-bg-brand-subtle)' }} role="status">
          <strong className="body-sm">You removed {removed}</strong>
          <span className="body-sm t-secondary">They may have copied the project's GitHub token. Replace it on GitHub and save the new one here.</span>
        </div>
      )}
      {!loading && !exists && (
        <div className="card body-sm t-secondary" style={{ padding: '12px 16px' }}>This project has no team yet. Add the first people and tick <strong>Admin</strong> for at least one of them: saving creates the team and stores the approvals already in the spec as its baseline.</div>
      )}

      <section className="card pad-xl stack gap-md" aria-labelledby="add-person">
        <h2 id="add-person" className="h3">Add person</h2>
        <label className="stack gap-xs" style={{ maxWidth: 420 }}>
          <span className="body-sm" style={{ fontWeight: 500 }}>Google account email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
        </label>
        <RoleBoxes value={roles} onChange={setRolesNew} name="new-roles" />
        <div className="row gap-md wrap">
          <Button variant="accent" onClick={add} disabled={busy || !email.trim()}>{busy ? 'Saving…' : 'Add person'}</Button>
          <span className="body-sm t-tertiary">They sign in with that Google account. Emails are saved in lower case.</span>
        </div>
      </section>

      <section className="card pad-xl stack gap-sm" aria-labelledby="team-list">
        <h2 id="team-list" className="h3">Team ({team?.length || 0})</h2>
        {loading && <span className="body-sm t-secondary">Loading…</span>}
        {(team || []).map((m) => {
          const onlyAdmin = m.roles.includes('Admin') && (team || []).filter((x) => x.roles.includes('Admin')).length === 1;
          return (
            <div key={m.email} className="stack gap-sm" style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 12 }}>
              <div className="row gap-md wrap" style={{ alignItems: 'center' }}>
                <strong className="body-sm" style={{ minWidth: 220 }}>{m.email}</strong>
                <span className="row gap-xs wrap" style={{ flex: 1 }}>{m.roles.map((r) => <Badge key={r} tone="brand">{r}</Badge>)}</span>
                {onlyAdmin && <span className="body-sm t-tertiary">Only Admin — cannot be removed</span>}
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setEditing(editing === m.email ? null : m.email); setEditRoles(m.roles); }}>{editing === m.email ? 'Cancel' : 'Edit roles'}</Button>
                <Button variant="secondary" size="sm" disabled={busy || onlyAdmin} title={onlyAdmin ? LAST_ADMIN : undefined}
                  onClick={() => { if (window.confirm(`Remove ${m.email} from ${p.name}?`)) void commit(removeMember(team || [], m.email), `${m.email} removed.`, m.email); }}>Remove</Button>
              </div>
              {editing === m.email && (
                <div className="stack gap-sm">
                  <RoleBoxes value={editRoles} onChange={setEditRoles} name={`roles-${m.email}`} />
                  <div><Button variant="accent" size="sm" disabled={busy} onClick={async () => { if (await commit(setRoles(team || [], m.email, editRoles), `Roles of ${m.email} saved.`)) setEditing(null); }}>Save roles</Button></div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
