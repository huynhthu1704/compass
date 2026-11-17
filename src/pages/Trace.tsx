import { go } from '../App';
import { isDone } from '../catalog';
import { weekly } from '../engine';
import type { Project } from '../types';
import { Badge, PageHead } from '../ui';

export function TracePage({ p }: { p: Project }) {
  const art = (id: string) => p.artefacts.find((a) => a.actionId === id);
  const w = p.metrics.length ? weekly(p.metrics) : null;
  const epics = [...new Set(p.stories.map((s) => s.epic))];
  const releases = p.changelog.filter((c) => c.type === 'release' || c.type === 'change');
  const link = (id: string, label: string) => { const a = art(id); return a ? <button className="badge tone-brand" style={{ border: 0, cursor: 'pointer' }} onClick={() => go(`/p/${p.id}/a/${a.id}`)}>{label}</button> : <Badge tone="warning">{label} missing</Badge>; };
  const gaps = [
    !isDone(p, 'success-metrics') && 'No success metric — value cannot be proven.',
    !isDone(p, 'requirements') && p.stories.length > 0 && 'Stories exist without a requirements list — trace them to a business requirement.',
    p.stories.some((s) => s.ac.length < 2) && 'Some stories have fewer than 2 acceptance criteria.',
    p.stories.some((s) => !s.events.length && s.epic !== 'Measurement') && 'Some stories have no tracking events — their usage cannot be monitored.',
    releases.length > 0 && !isDone(p, 'tracking-plan') && 'Released without a tracking plan.',
    releases.length > 0 && !p.metrics.length && 'Released but no usage data uploaded.',
  ].filter(Boolean) as string[];

  return (
    <div className="stack gap-xl">
      <PageHead over="Requirements life-cycle management · BABOK 5.1 Trace Requirements" title="Traceability" sub="Follow the thread from the business need to the stories that deliver it, the releases that shipped them and the metrics that prove value." />

      {gaps.length > 0 && <div className="card stack gap-xs" style={{ background: 'var(--color-bg-warning-subtle)', borderColor: 'transparent' }}><div className="h4 t-accent">Trace gaps ({gaps.length})</div>{gaps.map((g) => <div key={g} className="body-sm">• {g}</div>)}</div>}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Business need</th><th>Analysis</th><th>Epic</th><th>Stories</th><th>Tests</th><th>Released</th><th>Measured by</th></tr></thead>
          <tbody>
            {(epics.length ? epics : ['—']).map((e, i) => {
              const st = p.stories.filter((s) => s.epic === e);
              return (
                <tr key={e}>
                  {i === 0 && <td rowSpan={Math.max(epics.length, 1)} style={{ maxWidth: 220 }}><strong>{p.intent}</strong><div className="body-sm t-tertiary">{p.answers.metric}</div></td>}
                  {i === 0 && <td rowSpan={Math.max(epics.length, 1)}><div className="stack gap-xs">{link('problem-statement', 'Problem')}{link('success-metrics', 'KPIs')}{link('scope', 'Scope')}{link('requirements', 'Requirements')}</div></td>}
                  <td>{e}</td>
                  <td><div className="row gap-xs wrap">{st.map((s) => <Badge key={s.id} tone={s.status === 'Done' ? 'success' : 'neutral'}>{s.key}</Badge>)}</div></td>
                  <td>{isDone(p, 'test-scenarios') ? <Badge tone="success">{st.reduce((a, s) => a + s.ac.length, 0)} scenarios</Badge> : <Badge tone="warning">–</Badge>}</td>
                  <td>{releases.length ? <span className="mono-sm">{releases[releases.length - 1].date} · {releases[releases.length - 1].rollout}%</span> : <Badge>Not yet</Badge>}</td>
                  <td>{st.flatMap((s) => s.events).slice(0, 3).map((ev) => <div key={ev} className="mono-sm">{ev}</div>)}{w && i === 0 && <div className="body-sm t-brand">Activation {w.activationRate.toFixed(1)}%</div>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
