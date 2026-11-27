import { go, query } from '../App';
import { RunView, STATUS_TONE } from '../components/RunView';
import { agent } from '../harness';
import { pct } from '../guardrails';
import type { Project } from '../types';
import { ago, Badge, Button, PageHead } from '../ui';

export function RunsPage({ p }: { p: Project }) {
  // REQ-061: "+N more" on the Team floor opens /p/<id>/runs?status=awaiting-approval
  const onlyWaiting = query().get('status') === 'awaiting-approval';
  const feature = onlyWaiting ? query().get('feature') : null; // the Team floor's feature filter, if one was set
  const list = onlyWaiting ? p.runs.filter((r) => r.status === 'awaiting-approval' && (!feature || r.featureId === feature)) : p.runs;
  const tokens = p.runs.reduce((a, r) => a + r.steps.reduce((x, s) => x + (s.tokens || 0), 0), 0);
  const blocked = p.runs.filter((r) => r.guardrails.some((g) => g.level === 'block')).length;
  return (
    <div className="stack gap-xl">
      <PageHead over="Agent harness" title="Agent runs" sub="Every run is fully traced: plan, retrieval, tool calls, model turns, guardrails, evals and the human decision." />
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <div className="card kpi"><span className="label-sm t-tertiary">Runs</span><span className="v">{p.runs.length}</span></div>
        <div className="card kpi"><span className="label-sm t-tertiary">Awaiting approval</span><span className="v">{p.runs.filter((r) => r.status === 'awaiting-approval').length}</span></div>
        <div className="card kpi"><span className="label-sm t-tertiary">Blocked by guardrails</span><span className="v">{blocked}</span></div>
        <div className="card kpi"><span className="label-sm t-tertiary">Tokens used</span><span className="v">{tokens.toLocaleString()}</span></div>
      </div>
      {onlyWaiting && <div className="row gap-sm wrap"><Badge tone="accent">Showing runs waiting for approval{feature ? ` · ${feature}` : ''}</Badge><Button variant="ghost" size="sm" onClick={() => go(`/p/${p.id}/runs`)}>Show all runs</Button></div>}
      {!list.length ? <div className="empty">{onlyWaiting ? 'Nothing waiting for approval.' : 'No agent runs yet.'}</div> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Status</th><th>Agent</th><th>Goal</th><th>Eval</th><th>Mode</th><th>When</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => go(`/p/${p.id}/runs/${r.id}`)}>
              <td><Badge tone={STATUS_TONE[r.status]}>{r.status.replace('-', ' ')}</Badge></td><td>{agent(r.agent).name}</td><td>{r.goal.slice(0, 90)}</td>
              <td className="score">{r.evals.length ? `${pct(r.evals)}%` : '–'}</td><td>{r.mode}</td><td className="mono-sm">{ago(r.startedAt)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

export function RunPage({ p, rid }: { p: Project; rid: string }) {
  const r = p.runs.find((x) => x.id === rid);
  if (!r) return <div className="empty">Run not found.</div>;
  return (
    <div className="stack gap-lg">
      <div><Button variant="ghost" size="sm" onClick={() => go(`/p/${p.id}/runs`)}>← All runs</Button></div>
      <RunView key={r.id} p={p} r={r} />
    </div>
  );
}
