// F-015 SCR-3 / SCR-6 Team page (REQ-030, REQ-031, REQ-035, REQ-038 AC1). Design: compass/design/F-015.md.
// The super admin creates a project's first team (with its approval baseline); Admins add people with one or more
// roles, change roles and remove people. No project token any more: GitHub work uses the shared work token (REQ-043, SCR-9).
import { useEffect, useState } from 'react';
import { changeTeam, loadTeam, projectKey, reloadAccess, useSession } from '../firebase';
import { baselineFrom, LAST_ADMIN, TEAM_ROLES, type Member, type TeamOp, type TeamRole } from '../team';
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (!key || session.status !== 'signed-in') { setLoading(false); return; }
    let on = true;
    setLoading(true);
    loadTeam(key).then((t) => { if (!on) return; setTeam(t?.members || []); setExists(!!t); setLoadFailed(false); })
      .catch((e) => { if (on) { setLoadFailed(true); setMsg({ tone: 'danger', text: `Could not load the team: ${(e as Error).message}. Reload the page to try again.` }); } })
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [key, session.status]);

  if (session.status !== 'signed-in') return <PageHead over={`${p.name} · Team`} title="Team" sub="Sign in with Google to manage the team." />;
  if (!p.repo) return <PageHead over={`${p.name} · Team`} title="Team" sub="A team needs a GitHub repository. Local and demo projects have no team." />;
  if (!canManage) return <PageHead over={`${p.name} · Team`} title="Team" sub={`${refused ? 'Your last change was not saved: you can no longer change this team. ' : ''}Only Admins of this project and the super admin can manage its team.`} />;

  /** Applies one change to the team as it is in the database now (never a stale copy); the first change (super admin
   *  only) creates the team with its approval baseline. The page then shows the saved team. */
  const commit = async (op: TeamOp, done: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await changeTeam(key, { name: p.name, repo: p.repo! }, op, () => baselineFrom(p.spec));
      if (!r.ok) { setTeam(r.team); setMsg({ tone: 'danger', text: r.error }); return false; }
      setTeam(r.team); setExists(true); setMsg({ tone: 'success', text: done }); setRemoved(op.kind === 'remove' ? op.email.trim().toLowerCase() : null);
      return true;
    } catch (e) {
      const denied = (e as { code?: string }).code === 'permission-denied';
      if (denied) { setRefused(true); void reloadAccess().catch(() => undefined); }
      setMsg({ tone: 'danger', text: denied ? 'Not saved: you can no longer change this team (your Admin role may have been removed). Reload the page.' : `Not saved: ${(e as Error).message}` });
      return false;
    } finally { setBusy(false); }
  };

  const add = async () => {
    if (await commit({ kind: 'add', email, roles }, `${email.trim().toLowerCase()} added.`)) { setEmail(''); setRolesNew([]); }
  };

  return (
    <div className="stack gap-xl" style={{ maxWidth: 980 }}>
      <PageHead over={`${p.name} · Team`} title="Team" sub="People who can open this project and the gates their roles can pass. Only Admins and the super admin see this page." />

      {msg && <div style={{ padding: '12px 16px' }} className={`card body-sm ${msg.tone === 'danger' ? 't-danger' : 't-success'}`} role={msg.tone === 'danger' ? 'alert' : 'status'}>{msg.text}</div>}
      {removed && (
        <div className="card stack gap-xs" style={{ padding: '12px 16px', background: 'var(--color-bg-brand-subtle)' }} role="status">
          <strong className="body-sm">You removed {removed}</strong>
          <span className="body-sm t-secondary">They may have copied the shared work token and Anthropic key. Ask a super admin to replace both (REQ-031, REQ-043).</span>
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
          <Button variant="accent" onClick={add} disabled={busy || loading || loadFailed || !email.trim()}>{busy ? 'Saving…' : 'Add person'}</Button>
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
                <Button variant="secondary" size="sm" disabled={busy || loadFailed} aria-label={`${editing === m.email ? 'Cancel editing roles of' : 'Edit roles of'} ${m.email}`} onClick={() => { setEditing(editing === m.email ? null : m.email); setEditRoles(m.roles); }}>{editing === m.email ? 'Cancel' : 'Edit roles'}</Button>
                <Button variant="secondary" size="sm" disabled={busy || loadFailed || onlyAdmin} title={onlyAdmin ? LAST_ADMIN : undefined} aria-label={`Remove ${m.email}`}
                  onClick={() => { if (window.confirm(`Remove ${m.email} from ${p.name}?`)) void commit({ kind: 'remove', email: m.email }, `${m.email} removed.`); }}>Remove</Button>
              </div>
              {editing === m.email && (
                <div className="stack gap-sm">
                  <RoleBoxes value={editRoles} onChange={setEditRoles} name={`roles-${m.email}`} />
                  <div><Button variant="accent" size="sm" disabled={busy} aria-label={`Save roles of ${m.email}`} onClick={async () => { if (await commit({ kind: 'set', email: m.email, roles: editRoles }, `Roles of ${m.email} saved.`)) setEditing(null); }}>Save roles</Button></div>
                </div>
              )}
            </div>
          );
        })}
      </section>

    </div>
  );
}
