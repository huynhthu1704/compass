import { missingToken, tokenFor } from '../token';
import { useState } from 'react';
import { go } from '../App';
import { syncLabel, syncNow, useSync } from '../autosync';
import { DeleteNotice } from '../components/DeleteFeatureDialog';
import { STATUS_TONE } from '../components/RunView';
import { handoverMd } from '../framework';
import { agent, installFramework, pullSpec, startRun } from '../harness';
import { featureStage, stageStatus, type FeatureStage } from '../progress';
import { emptyIdea, featureName, featureReqs, featureRuns, featureTests, nextFeatureId } from '../spec';
import { now, store, useStore } from '../store';
import { STAGES, type Project } from '../types';
import { ago, Badge, Button, Field, Markdown, PageHead, STAGE_INFO, useAction } from '../ui';

const COLUMNS: FeatureStage[] = [...STAGES, 'done'];
const COL_NAME = (c: FeatureStage) => (c === 'done' ? 'Released' : STAGE_INFO[c].name);
const COL_CLS = (c: FeatureStage) => (c === 'done' ? 'tone-success' : STAGE_INFO[c].cls);

/** Create a feature from a raw idea and let the Ideation agent shape it. */
export function createFeature(p: Project, idea: string, name?: string) {
  const id = nextFeatureId(p.spec.features);
  store.spec(p.id, (s) => ({ ...s, features: [...s.features, { id, name: name?.trim() || featureName(idea), idea: { ...emptyIdea(), intent: idea.trim() }, createdAt: now() }] }));
  startRun(p.id, 'ideation', idea.trim(), { featureId: id });
  return id;
}

export function OverviewPage({ p }: { p: Project }) {
  const { settings } = useStore();
  const { busy, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const connected = !!tokenFor(p) && !!p.repo && !p.demo; // F-015 REQ-034: project token for members
  const sync = useSync(p.id);
  const sl = syncLabel(sync, p.dirty);
  const feats = p.spec.features.filter((f) => showArchived || !f.archived);
  const waiting = p.runs.filter((r) => r.status === 'awaiting-approval');

  return (
    <div className="stack gap-2xl">
      <PageHead
        over={p.repo ? `${p.repo.owner}/${p.repo.name}` : p.demo ? 'Demo project · not on GitHub' : 'Local project · not on GitHub'}
        title={p.name}
        sub={p.description || `${p.spec.features.length} feature(s) in parallel · stack: ${p.spec.stack}`}
        right={<>
          {p.repo && <a className="btn secondary sm" href={p.repo.htmlUrl} target="_blank" rel="noreferrer">Repository ↗</a>}
          {p.repo?.pagesUrl && <a className="btn secondary sm" href={p.repo.pagesUrl} target="_blank" rel="noreferrer">Live site ↗</a>}
          <Button variant="accent" onClick={() => setAdding(true)}>+ New feature</Button>
        </>}
      />

      <DeleteNotice pid={p.id} />

      {adding && (
        <section className="card pad-xl stack gap-md" style={{ borderColor: 'var(--color-bg-accent)' }}>
          <h2 className="h3">New feature</h2>
          <Field label="Idea / business outcome" help="One feature = one outcome. The Ideation agent turns it into a brief you approve."><textarea className="textarea" autoFocus value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Let friends comment on a shared trip so more travellers come back weekly" /></Field>
          <Field label="Short name (optional)"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trip comments" /></Field>
          <div className="row gap-sm">
            <Button variant="accent" disabled={idea.trim().length < 8} onClick={() => { const id = createFeature(p, idea, name); setAdding(false); setIdea(''); setName(''); go(`/p/${p.id}/f/${id}/idea`); }}>Create & shape idea</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </section>
      )}

      <section className="stack gap-md">
        <div className="row between wrap gap-sm">
          <h2 className="h3">Feature board</h2>
          <div className="row gap-sm">
            {waiting.length > 0 && <Button size="sm" variant="secondary" onClick={() => go(`/p/${p.id}/runs`)}>{waiting.length} awaiting approval</Button>}
            {p.spec.features.some((f) => f.archived) && <label className="row gap-xs body-sm"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived</label>}
          </div>
        </div>
        {!feats.length ? (
          <button className="action-card recommended" onClick={() => setAdding(true)} style={{ padding: 24 }}><Badge tone="accent">Start</Badge><div className="h3">Add your first feature</div><div className="t-secondary">Each feature runs through Idea → Requirements → Test cases → Build → Release on its own, so several can move in parallel.</div></button>
        ) : (
          <div className="kanban">
            {COLUMNS.map((c) => {
              const cards = feats.filter((f) => featureStage(p, f.id) === c);
              return (
                <div key={c} className="kcol">
                  <div className="row between"><span className={`chip ${COL_CLS(c)}`}>{COL_NAME(c)}</span><span className="mono-sm t-tertiary">{cards.length}</span></div>
                  {cards.map((f) => {
                    const reqs = featureReqs(p, f.id), tcs = featureTests(p, f.id);
                    const fr = featureRuns(p, f.id);
                    const wait = fr.filter((r) => r.status === 'awaiting-approval').length;
                    const prs = fr.filter((r) => r.agent === 'coder' && r.status === 'approved').length;
                    const st = stageStatus(p, f.id);
                    return (
                      <button key={f.id} className="action-card kcard" onClick={() => go(`/p/${p.id}/f/${f.id}`)}>
                        <div className="row gap-xs wrap"><span className="mono-sm t-brand">{f.id}</span>{f.archived && <Badge>archived</Badge>}{wait > 0 && <Badge tone="accent">{wait} to approve</Badge>}{prs > 0 && <Badge tone="brand">{prs} PR</Badge>}</div>
                        <div className="label-md">{f.name}</div>
                        <div className="body-sm t-tertiary">{f.idea.intent.slice(0, 90)}{f.idea.intent.length > 90 ? '…' : ''}</div>
                        <div className="row gap-xs">{STAGES.map((s) => <span key={s} className="progress grow" style={{ height: 4 }}><span style={{ width: st[s].done ? '100%' : '0%' }} /></span>)}</div>
                        <div className="mono-sm t-tertiary">{reqs.length} REQ · {tcs.length} TC</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pad-xl stack gap-md">
          <div className="row between"><h2 className="h3">Repository & framework</h2>{p.frameworkInstalled ? <Badge tone="success">framework installed</Badge> : <Badge tone="warning">not installed</Badge>}</div>
          <p className="body-sm t-secondary">The repo holds the source of truth: <span className="code-inline">AGENTS.md</span>, <span className="code-inline">compass/spec.json</span>, <span className="code-inline">compass/features/F-xxx.md</span>, guardrails, CI and deploy.</p>
          <Field label="Tech stack (all features)"><input className="input" value={p.spec.stack} onChange={(e) => store.spec(p.id, (s) => ({ ...s, stack: e.target.value }))} /></Field>
          {connected && <div className="row gap-sm wrap"><Badge tone={sl.tone}>{sl.text}</Badge><span className="body-sm t-tertiary">{settings.autoSync ? `Changes commit to ${p.repo!.defaultBranch} automatically.` : 'Auto-sync is off (Connections).'}</span></div>}
          {sync?.message && <div className="panel body-sm t-accent">{sync.message}</div>}
          <div className="row gap-sm wrap">
            {!p.frameworkInstalled && <Button disabled={!connected || busy} onClick={() => run(() => installFramework(p.id, { starter: false, direct: false }))}>Install via pull request</Button>}
            <Button variant="secondary" disabled={!connected || busy || !p.dirty} onClick={() => run(async () => { await syncNow(p.id); return 'Synced'; })}>Sync now</Button>
            <Button variant="ghost" disabled={!connected || busy} onClick={() => run(async () => { if (p.dirty && !confirm('Discard local changes and load compass/spec.json from GitHub?')) return; await pullSpec(p.id); return 'Spec loaded from GitHub'; })}>Pull from GitHub</Button>
          </div>
          {!connected && <div className="body-sm t-tertiary">{p.demo ? 'Demo project — GitHub actions are simulated.' : missingToken(p) ? `${missingToken(p)}` : 'Connect GitHub and link a repo to sync.'}</div>}
          <h3 className="h4" style={{ marginTop: 8 }}>Recent agent runs</h3>
          {p.runs.length ? p.runs.slice(0, 5).map((r) => (
            <button key={r.id} className="option" style={{ padding: 10 }} onClick={() => go(`/p/${p.id}/runs/${r.id}`)}>
              <span className="run-status"><Badge tone={STATUS_TONE[r.status]}>{r.status.replace('-', ' ')}</Badge></span>
              <span className="stack grow"><span className="label-md">{agent(r.agent).name}{r.featureId ? ` · ${r.featureId}` : ''}</span><span className="body-sm t-tertiary">{r.goal.slice(0, 70)}</span></span>
              <span className="mono-sm t-tertiary">{ago(r.startedAt)}</span>
            </button>
          )) : <div className="body-sm t-tertiary">No runs yet.</div>}
          <div><Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remove "${p.name}" from Compass? (The GitHub repo is not touched.)`)) { store.remove(p.id); go('/'); } }}>Remove project from Compass</Button></div>
        </section>

        <section className="card pad-xl stack gap-sm">
          <div className="row between"><h2 className="h3">Handover</h2><Badge tone="brand">compass/handover.md</Badge></div>
          <p className="body-sm t-tertiary">Regenerated on every sync, so whoever opens the repo next knows exactly where to start.</p>
          <Markdown text={handoverMd(p).replace(/^# Handover\n\n_.*_\n/, '')} />
        </section>
      </div>
    </div>
  );
}
