import { useEffect, useState } from 'react';
import { github } from '../github';
import { nextVersion, release } from '../harness';
import { store, useStore } from '../store';
import { missingToken, tokenFor } from '../token';
import { useGate } from '../approvals';
import type { Project } from '../types';
import { ago, Badge, Button, PageHead, useAction } from '../ui';

type WF = Awaited<ReturnType<typeof github.workflowRuns>>;

export function ReleasePage({ p }: { p: Project }) {
  useStore(); // re-render on store changes
  const ready = p.runs.filter((r) => r.agent === 'coder' && r.status === 'approved');
  const [sel, setSel] = useState<string[]>(ready.map((r) => r.id));
  const [log, setLog] = useState<string[]>([]);
  const [wf, setWf] = useState<WF | null>(null);
  const { busy, run } = useAction();
  const token = tokenFor(p); // F-015 REQ-034: the project token for signed-in members
  const live = !!token && !!p.repo && !p.demo;
  const releaseGate = useGate(p, 'release'); // F-015 REQ-033: DM or PO release
  const tag = nextVersion(p.releases.map((r) => r.tag));

  useEffect(() => { if (live) github.workflowRuns(token!, p.repo!).then(setWf).catch(() => setWf([])); }, [live, p.releases.length, token, p.repo]);

  const ship = () => run(async () => {
    setLog([]);
    const t = await release(p.id, sel, (s) => setLog((l) => [...l, s]));
    setLog((l) => [...l, `✓ Released ${t}`]);
    return `Released ${t}`;
  });

  return (
    <div className="stack gap-xl">
      <PageHead over="Stage 6 · Release · owner: Delivery Manager / PO" title="Release" sub="Release several features together. One click: verify CI on each agent PR, squash-merge, mark requirements Done, update the spec & handover, tag a GitHub release — the deploy workflow publishes to GitHub Pages."
        right={<>
          {p.repo?.pagesUrl && <a className="btn secondary sm" href={p.repo.pagesUrl} target="_blank" rel="noreferrer">Live site ↗</a>}
          {live && !p.repo?.pagesUrl && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(async () => { const pg = await github.enablePages(token!, p.repo!); store.update(p.id, (x) => ({ ...x, repo: x.repo && { ...x.repo, pagesUrl: pg.html_url } })); return 'GitHub Pages enabled'; })}>Enable GitHub Pages</Button>}
        </>} />

      <section className="card pad-xl stack gap-md">
        <div className="row between wrap gap-sm"><h2 className="h3">Ready to release</h2><Badge tone="brand">next: {tag}</Badge></div>
        {!ready.length ? <div className="body-sm t-tertiary">No approved agent changes waiting. Build something in the Build stage first.</div> : ready.map((r) => (
          <label key={r.id} className="option" style={{ padding: 10 }}>
            <input type="checkbox" checked={sel.includes(r.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
            {r.featureId && <Badge tone="info">{r.featureId} {p.spec.features.find((f) => f.id === r.featureId)?.name}</Badge>}<span className="mono t-brand">{(r.reqIds || []).join(', ')}</span><span className="grow">{r.goal}</span>
            {r.prNumber && <Badge tone="brand">PR #{r.prNumber}</Badge>}
            <Badge tone={r.guardrails.some((g) => g.level === 'block') ? 'danger' : 'success'}>guardrails {r.guardrails.some((g) => g.level === 'block') ? 'blocked' : 'passed'}</Badge>
          </label>
        ))}
        <div className="row gap-sm">
          {!releaseGate.allowed && <span className="body-sm t-tertiary">{releaseGate.hint}</span>}
          <Button variant="accent" disabled={busy || !sel.length || !!missingToken(p) || !releaseGate.allowed} title={releaseGate.hint} onClick={() => confirm(`Release ${tag} with ${sel.length} change(s)? This merges the PRs into ${p.repo?.defaultBranch || 'main'}.`) && ship()}>{busy ? 'Releasing…' : `Release ${tag}`}</Button>
          {!live && <span className="body-sm t-tertiary">{p.demo ? 'Demo — merge, tag and deploy are simulated.' : missingToken(p) || 'Connect GitHub to release for real.'}</span>}
        </div>
        {log.length > 0 && <div className="panel mono-sm stack gap-xs">{log.map((l, i) => <span key={i}>› {l}</span>)}</div>}
      </section>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pad-xl stack gap-sm">
          <h2 className="h3">Releases</h2>
          {p.releases.length ? p.releases.map((r) => (
            <div key={r.tag + r.date} className="row gap-sm"><Badge tone="success">{r.tag}</Badge><span className="body-sm grow">{(r.featureIds || []).join(', ')}{r.featureIds?.length ? ' · ' : ''}{r.prs.filter(Boolean).map((n) => `#${n}`).join(', ') || '—'}</span><span className="mono-sm t-tertiary">{ago(r.date)}</span>{r.url && <a className="btn ghost sm" href={r.url} target="_blank" rel="noreferrer">↗</a>}</div>
          )) : <div className="body-sm t-tertiary">No releases yet.</div>}
        </section>
        <section className="card pad-xl stack gap-sm">
          <h2 className="h3">CI / deploy runs</h2>
          {!live ? <div className="body-sm t-tertiary">Available for connected GitHub projects.</div> : !wf ? <div className="body-sm t-tertiary">Loading…</div> : wf.length ? wf.map((w) => (
            <a key={w.id} href={w.html_url} target="_blank" rel="noreferrer" className="option" style={{ padding: 8, textDecoration: 'none', color: 'inherit' }}>
              <span className="run-status"><Badge tone={w.conclusion === 'success' ? 'success' : w.conclusion ? 'danger' : 'warning'}>{w.conclusion || w.status}</Badge></span>
              <span className="body-sm grow" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{w.name} · {w.head_branch}</span><span className="mono-sm t-tertiary" style={{ whiteSpace: 'nowrap' }}>{ago(w.created_at)}</span>
            </a>
          )) : <div className="body-sm t-tertiary">No workflow runs yet.</div>}
        </section>
      </div>
    </div>
  );
}
