// F-015 SCR-8 "Users" (REQ-046, REQ-043): super admins see everyone on the teams; the owner makes people super admins;
// old project tokens are deleted here. Only super admins reach this page (App.tsx); the Firestore rules refuse a change
// of the super admin list from anyone but the owner, and token deletes from anyone but a super admin.
import { useEffect, useState } from 'react';
import { deleteOldProjectTokens, loadAllTeams, loadSuperAdmins, setSuperAdmins, useSession } from '../firebase';
import { normalizeEmail, ownerOf, peopleRows, withSuperAdmin, type PersonRow } from '../team';
import { Badge, Button, PageHead } from '../ui';

export function UsersPage() {
  const session = useSession();
  const [rows, setRows] = useState<PersonRow[] | null>(null);
  const [admins, setAdmins] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      const [teams, sas] = await Promise.all([loadAllTeams(), loadSuperAdmins()]);
      setAdmins(sas); setRows(peopleRows(teams, sas));
    } catch (e) { setMsg({ tone: 'danger', text: `Could not load people: ${(e as Error).message}` }); setRows([]); }
  };
  useEffect(() => { void load(); }, []);
  const isOwner = !!session.email && ownerOf(admins) === normalizeEmail(session.email);

  const toggle = async (email: string, on: boolean) => {
    setBusy(true); setMsg(null);
    try { await setSuperAdmins(withSuperAdmin(admins, email, on)); await load(); setMsg({ tone: 'success', text: `${email} is ${on ? 'now a super admin' : 'no longer a super admin'}. It applies at their next page load.` }); }
    catch (e) { setMsg({ tone: 'danger', text: `Not changed: ${(e as Error).message}` }); }
    finally { setBusy(false); }
  };
  const removeTokens = async () => {
    if (!confirm('Delete every old project token stored in Compass? This cannot be undone. Revoke them on GitHub too.')) return;
    setBusy(true); setMsg(null);
    try { await deleteOldProjectTokens(); setMsg({ tone: 'success', text: 'Deleted. Now revoke those tokens on GitHub (Settings → Developer settings → Personal access tokens).' }); }
    catch (e) { setMsg({ tone: 'danger', text: `Not deleted: ${(e as Error).message}` }); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack gap-xl" style={{ maxWidth: 980 }}>
      <PageHead over="Workspace · Users" title="Users" sub="Only super admins see this page. Everyone on the teams, with their projects. Only the owner makes people super admins." />
      {msg && <div style={{ padding: '12px 16px' }} className={`card body-sm ${msg.tone === 'danger' ? 't-danger' : 't-success'}`} role={msg.tone === 'danger' ? 'alert' : 'status'}>{msg.text}</div>}

      <section className="card pad-xl stack gap-md" aria-labelledby="people">
        <h2 id="people" className="h3">People ({rows?.length ?? '…'})</h2>
        {rows === null ? <p className="body-sm t-secondary">Loading…</p> : rows.map((r) => (
          <div key={r.email} className="row gap-md wrap" style={{ alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <strong className="body-sm" style={{ minWidth: 220 }}>{r.email}</strong>
            <span className="body-sm t-secondary" style={{ flex: '1 1 200px' }}>{r.projects.join(', ') || 'On no team'}</span>
            {r.badge && <Badge tone={r.badge === 'Owner' ? 'success' : 'brand'}>{r.badge}</Badge>}
            {r.badge === 'Owner'
              ? <span className="body-sm t-secondary">Always super admin</span>
              : <label className="row gap-xs body-sm" title={isOwner ? '' : 'Only the owner changes super admins'}>
                  <input type="checkbox" checked={r.superAdmin} disabled={!isOwner || busy} onChange={(e) => void toggle(r.email, e.target.checked)} aria-label={`Super admin: ${r.email}`} /> Super admin
                </label>}
          </div>
        ))}
      </section>

      <section className="card pad-xl stack gap-md" aria-labelledby="old-tokens">
        <div className="row gap-sm wrap" style={{ alignItems: 'center' }}><h2 id="old-tokens" className="h3">Old project tokens</h2><Badge tone="success">Nobody can read them</Badge></div>
        <p className="body t-secondary">Project Admins no longer set GitHub tokens (ADR-016). Delete any that remain, then revoke them on GitHub.</p>
        <div><Button variant="danger" disabled={busy} onClick={() => void removeTokens()}>Delete old project tokens</Button></div>
      </section>

      <div className="card stack gap-xs" role="note" style={{ padding: '12px 16px', background: 'var(--color-bg-brand-subtle)' }}>
        <strong className="body-sm">Only the owner changes super admins</strong>
        <span className="body-sm t-secondary">Super admins can see every project and the work token and Anthropic key. Give it only to people you fully trust.</span>
      </div>
    </div>
  );
}
