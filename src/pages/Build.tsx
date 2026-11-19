import { useState } from 'react';
import { go } from '../App';
import { AgentBox } from '../components/AgentBox';
import { RunView, STATUS_TONE } from '../components/RunView';
import { github } from '../github';
import { useStore } from '../store';
import type { Project } from '../types';
import { ago, Badge, Button, PageHead, useAction } from '../ui';

export function BuildPage({ p }: { p: Project }) {
  const { settings } = useStore();
  const ready = p.spec.requirements.filter((r) => r.status === 'Approved' || r.status === 'In build');
  const [sel, setSel] = useState<string[]>(ready.filter((r) => r.status === 'Approved').slice(0, 1).map((r) => r.id));
  const runs = p.runs.filter((r) => r.agent === 'coder');
  const latest = runs[0];
  const chosen = p.spec.requirements.filter((r) => sel.includes(r.id));
  const noTests = chosen.filter((r) => !p.spec.tests.some((t) => t.reqIds.includes(r.id)));

  return (
    <div className="stack gap-xl">
      <PageHead over="Stage 4 · Build · owner: Developer" title="Build" sub="The coding agent reads the repo (RAG), proposes a change set with tests, passes guardrails and evals, and — after your approval — opens a pull request." />

      <section className="card pad-xl stack gap-md">
        <h2 className="h4">1 · Choose requirements to implement</h2>
        {!ready.length ? <div className="body-sm t-tertiary">No approved requirements. Approve some in <button className="btn ghost sm" onClick={() => go(`/p/${p.id}/requirements`)}>Requirements</button>.</div> : (
          <div className="stack gap-xs">
            {ready.map((r) => (
              <label key={r.id} className="option" style={{ padding: 10 }}>
                <input type="checkbox" checked={sel.includes(r.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
                <span className="mono t-brand">{r.id}</span><span className="grow">{r.title}</span>
                <Badge tone={r.status === 'Approved' ? 'brand' : 'info'}>{r.status}</Badge>
                <Badge tone={p.spec.tests.some((t) => t.reqIds.includes(r.id)) ? 'success' : 'danger'}>{p.spec.tests.filter((t) => t.reqIds.includes(r.id)).length} tests</Badge>
              </label>
            ))}
          </div>
        )}
        {noTests.length > 0 && <div className="body-sm t-accent">{noTests.map((r) => r.id).join(', ')} {noTests.length > 1 ? 'have' : 'has'} no test cases — the agent will write tests from the acceptance criteria, but QA should add test cases first.</div>}
      </section>

      <AgentBox key={sel.join(',')} p={p} agentId="coder" reqIds={sel} cta="Implement with agent" defaultGoal={chosen.map((r) => r.title).join(' + ') || 'Implement the selected requirements'} disabled={!sel.length ? 'Select at least one requirement.' : undefined} hint={p.repo && !p.demo ? `Approval will create branch compass/${sel.join('-').toLowerCase()}-… on ${p.repo.owner}/${p.repo.name} and open a PR. CI (tests + spec check) runs on it.` : 'Demo / local project: the PR step is simulated.'} />

      {latest && !['running', 'awaiting-approval', 'failed'].includes(latest.status) && <section className="card pad-xl"><RunView p={p} r={latest} /></section>}

      {runs.length > 0 && (
        <section className="stack gap-md">
          <h2 className="h3">Agent pull requests</h2>
          {runs.map((r) => <PrRow key={r.id} p={p} rid={r.id} token={settings.githubToken} />)}
        </section>
      )}
    </div>
  );
}

function PrRow({ p, rid, token }: { p: Project; rid: string; token?: string }) {
  const r = p.runs.find((x) => x.id === rid)!;
  const [checks, setChecks] = useState<{ name: string; status: string; conclusion: string | null; html_url: string }[] | null>(null);
  const { busy, run } = useAction();
  const load = () => run(async () => { const pr = await github.getPR(token!, p.repo!, r.prNumber!); setChecks(await github.checks(token!, p.repo!, pr.head.sha)); });
  return (
    <div className="card stack gap-sm">
      <div className="row gap-sm wrap">
        <Badge tone={STATUS_TONE[r.status]}>{r.status.replace('-', ' ')}</Badge>
        <span className="label-md grow">{(r.reqIds || []).join(', ')} · {r.goal}</span>
        {r.prUrl ? <a className="btn ghost sm" href={r.prUrl} target="_blank" rel="noreferrer">PR #{r.prNumber} ↗</a> : r.prNumber ? <Badge>PR #{r.prNumber} (demo)</Badge> : null}
        {r.prNumber && token && p.repo && !p.demo && <Button size="sm" variant="secondary" disabled={busy} onClick={load}>{busy ? '…' : 'CI status'}</Button>}
        <Button size="sm" variant="ghost" onClick={() => go(`/p/${p.id}/runs/${r.id}`)}>Trace</Button>
        <span className="mono-sm t-tertiary">{ago(r.startedAt)}</span>
      </div>
      {checks && <div className="row gap-sm wrap">{checks.length ? checks.map((c) => <a key={c.name} href={c.html_url} target="_blank" rel="noreferrer" className={`badge tone-${c.conclusion === 'success' ? 'success' : c.conclusion ? 'danger' : 'warning'}`}>{c.name}: {c.conclusion || c.status}</a>) : <span className="body-sm t-tertiary">No checks yet — CI may still be starting.</span>}</div>}
    </div>
  );
}
