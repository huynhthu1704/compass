/** F-012 · Delete a feature: the dialog (design SCR-1, SCR-2, SCR-3) and the notice on the feature board afterwards. */
import { getSession } from '../firebase';
import { missingTokenMessage } from '../team';
import { tokenFor } from '../token';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { go } from '../App';
import { canConfirmDelete, deleteFeature, deleteSummary, removeFeature, type DeleteGitHub, type DeleteResult, type IssueRef } from '../deleteFeature';
import { specFiles } from '../framework';
import { github } from '../github';
import { store, useStore } from '../store';
import type { Project, Requirement } from '../types';
import { Badge, Button, REQ_STATUS_TONE } from '../ui';

// ---- the notice shown on the board after a delete (kept in memory until dismissed) ----
type Notice = { pid: string; fid: string; name: string; result: DeleteResult };
let notice: Notice | null = null;
const subs = new Set<() => void>();
const setNotice = (n: Notice | null) => { notice = n; subs.forEach((l) => l()); };
const subscribe = (l: () => void) => { subs.add(l); return () => { subs.delete(l); }; };
const getNotice = () => notice;

/** The GitHub calls of a live delete (src/github.ts). */
const deleteGitHub: DeleteGitHub = {
  fileExists: async (t, r, path) => !!(await github.file(t, r, path)),
  commit: (t, r, branch, message, changes) => github.commit(t, r, branch, message, changes),
  openIssues: (t, r) => github.openIssues(t, r),
  commentIssue: (t, r, n, body) => github.commentIssue(t, r, n, body),
  closeIssue: (t, r, n) => github.closeIssue(t, r, n),
};

export function DeleteNotice({ pid }: { pid: string }) {
  const n = useSyncExternalStore(subscribe, getNotice);
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
  useStore(); // re-render on store changes
  const f = p.spec.features.find((x) => x.id === fid);
  const token = tokenFor(p); // F-015 REQ-034: the project token for signed-in members
  const live = !p.demo && !!p.repo && !!token;
  const needsGitHub = !p.demo && !!p.repo && !token;
  const [typed, setTyped] = useState('');
  const [issues, setIssues] = useState<IssueRef[] | null>(live ? null : []);
  const [issueErr, setIssueErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, []);
  // REQ-016: keyboard stays inside the dialog wherever focus is (also after a click on plain text in it).
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; });
  useEffect(() => {
    const focusables = () => (box.current ? [...box.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')] : []);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); if (!busyRef.current) closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1], at = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && at <= 0) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === -1 || at === items.length - 1)) { e.preventDefault(); first.focus(); }
    };
    const onFocus = (e: FocusEvent) => { if (box.current && !box.current.contains(e.target as Node)) input.current?.focus(); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => { document.removeEventListener('keydown', onKey, true); document.removeEventListener('focusin', onFocus); };
  }, []);
  useEffect(() => {
    if (!live || !p.repo || !token) return;
    let on = true;
    github.openIssues(token, p.repo).then((x) => on && setIssues(x)).catch((e) => { if (on) { setIssues([]); setIssueErr((e as Error).message); } });
    return () => { on = false; };
  }, [live, p.repo, token]);

  if (!f) return null;
  const s = deleteSummary(p, fid, issues || []);
  const ok = canConfirmDelete(typed, fid) && !busy && !needsGitHub;

  const confirm = async () => {
    if (!ok) return;
    setBusy(true); setError('');
    try {
      const result = await deleteFeature(p, fid, {
        token, github: deleteGitHub, specFiles,
        // Re-apply on the current project so edits made while the commit ran are kept (and left to auto-sync).
        apply: (spec, _runs, sha) => store.update(p.id, (x) => {
          const now = removeFeature(x.spec, x.runs, fid);
          return { ...x, ...now, dirty: sha ? JSON.stringify(now.spec) !== JSON.stringify(spec) : x.dirty, ...(sha ? { specSha: sha } : {}) };
        }),
      });
      setNotice({ pid: p.id, fid, name: f.name, result });
      onClose();
      go(`/p/${p.id}`);
    } catch (e) {
      setError(`Nothing was deleted: ${(e as Error).message}`);
      setBusy(false);
    }
  };

  const row = (id: string, text: string, status?: Requirement['status']) => (
    <li key={id} className="row gap-sm"><span className="mono-sm t-brand">{id}</span><span className="grow">{text}</span>{status && <Badge tone={REQ_STATUS_TONE[status]}>{status}</Badge>}</li>
  );

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dialog stack gap-lg" role="dialog" aria-modal="true" aria-labelledby="delete-title" ref={box} tabIndex={-1}>
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
            {s.requirements.length ? <ul className="stack gap-xs body-sm">{s.requirements.map((r) => row(r.id, r.title, r.status))}</ul> : <span className="body-sm t-tertiary">None.</span>}
          </section>
          <section className="stack gap-xs">
            <strong className="body-sm">Test cases ({s.tests.length})</strong>
            {s.tests.length ? <ul className="stack gap-xs body-sm">{s.tests.map((t) => row(t.id, t.title))}</ul> : <span className="body-sm t-tertiary">None.</span>}
            {s.sharedTests.length > 0 && <span className="body-sm t-tertiary">Kept, without this feature's requirements: {s.sharedTests.map((t) => t.id).join(', ')}</span>}
          </section>
          <section className="stack gap-xs">
            <strong className="body-sm">Files in the repo ({s.files.length})</strong>
            <ul className="stack gap-xs body-sm">{s.files.map((path) => <li key={path} className="mono-sm">{path}</li>)}</ul>
          </section>
          <section className="stack gap-xs">
            <strong className="body-sm">Open GitHub issues{issues ? ` (${s.issues.length})` : ''} · closed as "not planned" with a comment</strong>
            {!live ? <span className="body-sm t-tertiary">{p.demo || !p.repo ? 'Demo or local project: nothing is sent to GitHub.' : 'Connect GitHub to see and close its issues.'}</span>
              : issues === null ? <span className="body-sm t-tertiary">Looking up open issues…</span>
              : issueErr ? <span className="body-sm t-danger">Could not read the issues: {issueErr}</span>
              : s.issues.length ? <ul className="stack gap-xs body-sm">{s.issues.map((i) => <li key={i.number} className="row gap-sm"><a className="mono-sm" href={i.html_url} target="_blank" rel="noreferrer">#{i.number}</a><span className="grow">{i.title}</span></li>)}</ul>
              : <span className="body-sm t-tertiary">None open.</span>}
          </section>
        </div>

        <div className="field">
          <label htmlFor="delete-confirm">Type {fid} to confirm</label>
          <input id="delete-confirm" ref={input} className="input" autoComplete="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }} />
          {needsGitHub && <div className="help error">{getSession().status === 'signed-in' ? `${missingTokenMessage(true)}, so the feature's files and issues are removed too.` : "Connect GitHub first (Connections), so the feature's files and issues are removed too."}</div>}
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
