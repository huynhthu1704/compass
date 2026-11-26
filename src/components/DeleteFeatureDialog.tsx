/** F-012 · Delete a feature: the dialog (design SCR-1, SCR-2, SCR-3) and the notice on the feature board afterwards. */
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { go } from '../App';
import { canConfirmDelete, deleteFeature, deleteSummary, type DeleteResult, type IssueRef } from '../deleteFeature';
import { specFiles } from '../framework';
import { github } from '../github';
import { store, useStore } from '../store';
import type { Project } from '../types';
import { Badge, Button, REQ_STATUS_TONE } from '../ui';

// ---- the notice shown on the board after a delete (kept in memory until dismissed) ----
type Notice = { pid: string; fid: string; name: string; result: DeleteResult };
let notice: Notice | null = null;
const subs = new Set<() => void>();
const setNotice = (n: Notice | null) => { notice = n; subs.forEach((l) => l()); };

export function DeleteNotice({ pid }: { pid: string }) {
  const n = useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l); }, () => notice);
  if (!n || n.pid !== pid) return null;
  const { closed, stillOpen, issueError, local } = n.result;
  const clean = !stillOpen.length && !issueError;
  const total = closed.length + stillOpen.length;
  const title = local ? `${n.fid} · ${n.name} deleted locally (nothing sent to GitHub)`
    : clean ? `${n.fid} · ${n.name} deleted · ${total ? `${total} issue${total > 1 ? 's' : ''} closed as not planned` : 'no open issues'}`
    : `${n.fid} · ${n.name} deleted · ${closed.length} of ${total} issue${total === 1 ? '' : 's'} closed`;
  const needsIssues = [...stillOpen.map((i) => i.reason || ''), issueError || ''].some((r) => /\b403\b/.test(r));
  return (
    <div className={`delete-notice ${clean ? 'is-ok' : 'is-partial'}`} role="status">
      <div className="row between start gap-md">
        <strong className="body-sm">{title}</strong>
        <button className="btn ghost sm" aria-label="Dismiss" onClick={() => setNotice(null)}>✕</button>
      </div>
      {issueError && <p className="body-sm t-secondary">Could not read the open issues ({issueError}). Check them on GitHub.</p>}
      {stillOpen.length > 0 && (
        <ul className="body-sm t-secondary">
          {stillOpen.map((i) => <li key={i.number}>Still open: <a href={i.url} target="_blank" rel="noreferrer">#{i.number}</a> {i.title} — {i.reason}</li>)}
        </ul>
      )}
      {needsIssues && <p className="body-sm t-secondary">Your GitHub token needs <strong>Issues: Read &amp; write</strong>. Close them on GitHub, or fix the token on the Connect page.</p>}
    </div>
  );
}

// ---- the dialog ----
export function DeleteFeatureDialog({ p, fid, onClose }: { p: Project; fid: string; onClose: () => void }) {
  const { settings } = useStore();
  const f = p.spec.features.find((x) => x.id === fid);
  const live = !p.demo && !!p.repo && !!settings.githubToken;
  const [typed, setTyped] = useState('');
  const [issues, setIssues] = useState<IssueRef[] | null>(live ? null : []);
  const [issueErr, setIssueErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (!live || !p.repo || !settings.githubToken) return;
    let on = true;
    github.openIssues(settings.githubToken, p.repo).then((x) => on && setIssues(x)).catch((e) => { if (on) { setIssues([]); setIssueErr((e as Error).message); } });
    return () => { on = false; };
  }, [live, p.repo, settings.githubToken]);

  if (!f) return null;
  const s = deleteSummary(p, fid, issues || []);
  const ok = canConfirmDelete(typed, fid) && !busy;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && !busy) { e.preventDefault(); onClose(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const confirm = async () => {
    if (!ok) return;
    setBusy(true); setError('');
    try {
      const result = await deleteFeature(p, fid, {
        token: settings.githubToken, github, specFiles,
        apply: (spec, runs, sha) => store.update(p.id, (x) => ({ ...x, spec, runs, dirty: sha ? false : x.dirty || (!!x.repo && !x.demo), ...(sha ? { specSha: sha } : {}) })),
      });
      setNotice({ pid: p.id, fid, name: f.name, result });
      onClose();
      go(`/p/${p.id}`);
    } catch (e) {
      setError(`Nothing was deleted: ${(e as Error).message}`);
      setBusy(false);
    }
  };

  const Row = ({ id, text, status }: { id: string; text: string; status?: Parameters<typeof Badge>[0]['children'] & string }) => (
    <li className="row gap-sm"><span className="mono-sm t-brand">{id}</span><span className="grow">{text}</span>{status && <Badge tone={REQ_STATUS_TONE[status as keyof typeof REQ_STATUS_TONE]}>{status}</Badge>}</li>
  );

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dialog stack gap-lg" role="dialog" aria-modal="true" aria-labelledby="delete-title" ref={box} onKeyDown={onKey}>
        <div className="stack gap-xs">
          <h2 id="delete-title" className="h3">Delete {f.id} · {f.name}?</h2>
          <p className="body-sm t-secondary">This cannot be undone in Compass. To hide the feature but keep it, use Archive instead.</p>
        </div>

        {s.warn && (
          <div className="dialog-warning stack gap-xs" role="alert">
            <strong className="body-sm t-danger">⚠ This feature already has code</strong>
            {s.built.length > 0 && <p className="body-sm">{s.built.map((r) => `${r.id} (${r.status})`).join(', ')} {s.built.length > 1 ? 'are' : 'is'} referenced by code and tests in the repo. Deleting the feature does not remove them — clean them up in a separate change.</p>}
            {s.openPrs.length > 0 && <ul className="body-sm">{s.openPrs.map((r) => <li key={r.id}><a href={r.prUrl} target="_blank" rel="noreferrer">#{r.prNumber}</a> {r.goal} · stays open</li>)}</ul>}
          </div>
        )}

        <div className="dialog-list stack gap-md">
          <div className="overline t-tertiary">What will be removed</div>
          <section className="stack gap-xs">
            <strong className="body-sm">Requirements ({s.requirements.length})</strong>
            {s.requirements.length ? <ul className="stack gap-xs body-sm">{s.requirements.map((r) => <Row key={r.id} id={r.id} text={r.title} status={r.status} />)}</ul> : <span className="body-sm t-tertiary">None.</span>}
          </section>
          <section className="stack gap-xs">
            <strong className="body-sm">Test cases ({s.tests.length})</strong>
            {s.tests.length ? <ul className="stack gap-xs body-sm">{s.tests.map((t) => <Row key={t.id} id={t.id} text={t.title} />)}</ul> : <span className="body-sm t-tertiary">None.</span>}
            {s.sharedTests.length > 0 && <span className="body-sm t-tertiary">Kept, without this feature's requirements: {s.sharedTests.map((t) => t.id).join(', ')}</span>}
          </section>
          <section className="stack gap-xs">
            <strong className="body-sm">Files in the repo ({s.files.length})</strong>
            <ul className="stack gap-xs body-sm">{s.files.map((path) => <li key={path} className="mono-sm">{path}</li>)}</ul>
          </section>
          <section className="stack gap-xs">
            <strong className="body-sm">Open GitHub issues{issues ? ` (${s.issues.length})` : ''} · closed as "not planned" with a comment</strong>
            {!live ? <span className="body-sm t-tertiary">{p.demo || !p.repo ? 'Demo or local project: nothing is sent to GitHub.' : 'Connect GitHub to close its issues.'}</span>
              : issues === null ? <span className="body-sm t-tertiary">Looking up open issues…</span>
              : issueErr ? <span className="body-sm t-danger">Could not read the issues: {issueErr}</span>
              : s.issues.length ? <ul className="stack gap-xs body-sm">{s.issues.map((i) => <li key={i.number} className="row gap-sm"><a className="mono-sm" href={i.html_url} target="_blank" rel="noreferrer">#{i.number}</a><span className="grow">{i.title}</span></li>)}</ul>
              : <span className="body-sm t-tertiary">None open.</span>}
          </section>
        </div>

        <div className="field">
          <label htmlFor="delete-confirm">Type {fid} to confirm</label>
          <input id="delete-confirm" ref={input} className="input" autoComplete="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }} />
          {!canConfirmDelete(typed, fid) && <div className="help">Delete stays off until the text is exactly {fid}.</div>}
          {error && <div className="help error" role="alert">{error}</div>}
        </div>

        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <button className="btn danger-solid" onClick={confirm} disabled={!ok}>{busy ? 'Deleting…' : 'Delete feature'}</button>
        </div>
      </div>
    </div>
  );
}
