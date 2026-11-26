import { go } from '../App';
import { STATUS_TONE } from '../components/RunView';
import { agent } from '../harness';
import { featureStage, stageStatus } from '../progress';
import { featureOf, featureReqs, featureRuns } from '../spec';
import { store } from '../store';
import { STAGES, type Project } from '../types';
import { ago, Badge, Button, Field, PageHead, REQ_STATUS_TONE, STAGE_INFO, StageChip } from '../ui';

const NEXT: Record<string, string> = {
  idea: 'Write the business need; the Ideation agent revises it into a business intent for you to approve (PO).',
  requirements: 'Review the generated requirements and approve them (PO/BA). Approving the last one starts the Design agent.',
  design: 'Review the generated design, draw it in the design tool, link the frames and approve it (UX/PO). Coding unlocks after approval.',
  tests: 'Generate test cases so every requirement of this feature is covered (QA).',
  build: 'Pick approved requirements and let the coding agent open a pull request (Dev).',
  release: 'Ship the approved pull requests from the project Release page (DM/PO).',
  done: 'All requirements of this feature are released. Add more requirements, or archive the feature.',
};

export const stagePath = (pid: string, fid: string, s: string) => (s === 'release' || s === 'done' ? `/p/${pid}/release` : `/p/${pid}/f/${fid}/${s}`);

export function FeaturePage({ p, fid }: { p: Project; fid: string }) {
  const f = featureOf(p, fid);
  if (!f) return <div className="empty">Feature not found.</div>;
  const st = stageStatus(p, fid), cur = featureStage(p, fid);
  const runs = featureRuns(p, fid);
  const reqs = featureReqs(p, fid);
  const setF = (patch: Partial<typeof f>) => store.spec(p.id, (s) => ({ ...s, features: s.features.map((x) => (x.id === fid ? { ...x, ...patch } : x)) }));

  return (
    <div className="stack gap-2xl">
      <div><Button variant="ghost" size="sm" onClick={() => go(`/p/${p.id}`)}>← Feature board</Button></div>
      <PageHead over={`${p.name} · ${f.id}${f.archived ? ' · archived' : ''}`} title={f.name} sub={f.idea.intent || 'No business intent yet.'}
        right={<Button size="sm" variant="ghost" onClick={() => setF({ archived: !f.archived })}>{f.archived ? 'Unarchive' : 'Archive feature'}</Button>} />

      <section className="stack gap-md">
        <div className="stage-strip">
          {STAGES.map((s) => (
            <button key={s} className={`action-card ${s === cur ? 'selected' : ''}`} onClick={() => go(stagePath(p.id, fid, s))} style={{ gap: 6 }}>
              <StageChip stage={s} active={s === cur} done={st[s].done} />
              <div className="body-sm t-secondary">{st[s].note}</div>
              <div className="mono-sm t-tertiary">{STAGE_INFO[s].agent} · {STAGE_INFO[s].role}</div>
            </button>
          ))}
        </div>
        <div className="card row gap-md wrap" style={{ background: 'var(--color-bg-accent-subtle)', borderColor: 'var(--color-bg-accent)' }}>
          <Badge tone="accent">★ Next step</Badge>
          <span className="grow">{NEXT[cur]}</span>
          {cur !== 'done' && <Button variant="accent" onClick={() => go(stagePath(p.id, fid, cur))}>Go to {STAGE_INFO[cur].name}</Button>}
        </div>
      </section>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pad-xl stack gap-md">
          <h2 className="h3">Feature</h2>
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ name: e.target.value })} /></Field>
          <div className="stack gap-xs">
            <span className="label-md">Requirements ({reqs.length})</span>
            {reqs.length ? reqs.map((r) => <div key={r.id} className="row gap-sm body-sm"><span className="mono t-brand">{r.id}</span><span className="grow">{r.title}</span><Badge tone={REQ_STATUS_TONE[r.status]}>{r.status}</Badge></div>) : <span className="body-sm t-tertiary">None yet.</span>}
          </div>
        </section>
        <section className="card pad-xl stack gap-sm">
          <h2 className="h3">Agent runs for this feature</h2>
          {runs.length ? runs.map((r) => (
            <button key={r.id} className="option" style={{ padding: 10 }} onClick={() => go(`/p/${p.id}/runs/${r.id}`)}>
              <span className="run-status"><Badge tone={STATUS_TONE[r.status]}>{r.status.replace('-', ' ')}</Badge></span>
              <span className="stack grow"><span className="label-md">{agent(r.agent).name}</span><span className="body-sm t-tertiary">{r.goal.slice(0, 80)}</span></span>
              <span className="mono-sm t-tertiary">{ago(r.startedAt)}</span>
            </button>
          )) : <div className="body-sm t-tertiary">No runs yet.</div>}
        </section>
      </div>
    </div>
  );
}
