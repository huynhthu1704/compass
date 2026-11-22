import { go } from '../App';
import { syncLabel, syncNow, useSync } from '../autosync';
import { handoverMd } from '../framework';
import { installFramework, pullSpec } from '../harness';
import { currentStage, stageStatus } from '../progress';
import { store, useStore } from '../store';
import { STAGES, type Project } from '../types';
import { STATUS_TONE } from '../components/RunView';
import { agent } from '../harness';
import { ago, Badge, Button, Markdown, PageHead, STAGE_INFO, StageChip, useAction } from '../ui';

const NEXT: Record<string, string> = {
  idea: 'Shape the idea with the Ideation agent and approve the brief.',
  requirements: 'Generate requirements, then approve them (PO/BA).',
  tests: 'Generate test cases so every requirement is covered (QA).',
  build: 'Pick approved requirements and let the coding agent open a pull request.',
  release: 'Check CI on agent PRs, then merge, tag and deploy in one click.',
};

export function OverviewPage({ p }: { p: Project }) {
  const { settings } = useStore();
  const st = stageStatus(p), cur = currentStage(p);
  const { busy, run } = useAction();
  const connected = !!settings.githubToken && !!p.repo && !p.demo;
  const sync = useSync(p.id);
  const sl = syncLabel(sync, p.dirty);

  return (
    <div className="stack gap-2xl">
      <PageHead
        over={p.repo ? `${p.repo.owner}/${p.repo.name}` : p.demo ? 'Demo project · not on GitHub' : 'Local project · not on GitHub'}
        title={p.name}
        sub={p.spec.idea.intent || p.description}
        right={<>
          {p.repo && <a className="btn secondary sm" href={p.repo.htmlUrl} target="_blank" rel="noreferrer">Repository ↗</a>}
          {p.repo?.pagesUrl && <a className="btn secondary sm" href={p.repo.pagesUrl} target="_blank" rel="noreferrer">Live site ↗</a>}
          <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remove "${p.name}" from Compass? (The GitHub repo is not touched.)`)) { store.remove(p.id); go('/'); } }}>Remove</Button>
        </>}
      />

      <section className="stack gap-md">
        <h2 className="h3">Pipeline</h2>
        <div className="grid-6" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {STAGES.map((s) => (
            <button key={s} className={`action-card ${s === cur ? 'selected' : ''}`} onClick={() => go(`/p/${p.id}/${s}`)} style={{ gap: 6 }}>
              <StageChip stage={s} active={s === cur} done={st[s].done} />
              <div className="body-sm t-secondary">{st[s].note}</div>
              <div className="mono-sm t-tertiary">{STAGE_INFO[s].agent} · {STAGE_INFO[s].role}</div>
            </button>
          ))}
        </div>
        <div className="card row gap-md wrap" style={{ background: 'var(--color-bg-accent-subtle)', borderColor: 'var(--color-bg-accent)' }}>
          <Badge tone="accent">★ Next step</Badge>
          <span className="grow">{NEXT[cur]}</span>
          <Button variant="accent" onClick={() => go(`/p/${p.id}/${cur}`)}>Go to {STAGE_INFO[cur].name}</Button>
        </div>
      </section>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pad-xl stack gap-md">
          <div className="row between"><h2 className="h3">Compass Framework</h2>{p.frameworkInstalled ? <Badge tone="success">installed</Badge> : <Badge tone="warning">not installed</Badge>}</div>
          <p className="body-sm t-secondary">The framework makes the repo self-explaining for any role or agent: <span className="code-inline">AGENTS.md</span>, <span className="code-inline">compass/spec.json</span>, generated docs, guardrails, a traceability check in CI and a Pages deploy workflow.</p>
          {connected && <div className="row gap-sm wrap"><Badge tone={sl.tone}>{sl.text}</Badge>{settings.autoSync ? <span className="body-sm t-tertiary">Every change is committed to {p.repo!.defaultBranch} automatically.</span> : <span className="body-sm t-tertiary">Auto-sync is off (Connections).</span>}</div>}
          {sync?.message && <div className="panel body-sm t-accent">{sync.message}</div>}
          <div className="row gap-sm wrap">
            {!p.frameworkInstalled && <Button disabled={!connected || busy} onClick={() => run(() => installFramework(p.id, { starter: false, direct: false }))}>Install via pull request</Button>}
            <Button variant="secondary" disabled={!connected || busy || !p.dirty} onClick={() => run(async () => { await syncNow(p.id); return 'Synced'; })}>Sync now</Button>
            <Button variant="ghost" disabled={!connected || busy} onClick={() => run(async () => { if (p.dirty && !confirm('Discard local spec changes and load compass/spec.json from GitHub?')) return; await pullSpec(p.id); return 'Spec loaded from GitHub'; })}>Pull spec from GitHub</Button>
          </div>
          {!connected && <div className="body-sm t-tertiary">{p.demo ? 'Demo project — GitHub actions are simulated.' : 'Connect GitHub and link a repo to sync.'}</div>}
          <h3 className="h4" style={{ marginTop: 8 }}>Recent agent runs</h3>
          {p.runs.length ? p.runs.slice(0, 6).map((r) => (
            <button key={r.id} className="option" style={{ padding: 10 }} onClick={() => go(`/p/${p.id}/runs/${r.id}`)}>
              <Badge tone={STATUS_TONE[r.status]}>{r.status.replace('-', ' ')}</Badge>
              <span className="stack grow"><span className="label-md">{agent(r.agent).name}</span><span className="body-sm t-tertiary">{r.goal.slice(0, 80)}</span></span>
              <span className="mono-sm t-tertiary">{ago(r.startedAt)}</span>
            </button>
          )) : <div className="body-sm t-tertiary">No runs yet.</div>}
        </section>

        <section className="card pad-xl stack gap-sm">
          <div className="row between"><h2 className="h3">Handover</h2><Badge tone="brand">compass/handover.md</Badge></div>
          <p className="body-sm t-tertiary">Regenerated on every spec commit, so whoever opens the repo next knows exactly where to start.</p>
          <Markdown text={handoverMd(p).replace(/^# Handover\n\n_.*_\n/, '')} />
        </section>
      </div>
    </div>
  );
}
