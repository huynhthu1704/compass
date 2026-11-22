import { AgentBox } from '../components/AgentBox';
import { evalTests, pct } from '../guardrails';
import { nextId, store } from '../store';
import type { Project, TestCase } from '../types';
import { Badge, Button, PageHead } from '../ui';

export function TestsPage({ p }: { p: Project }) {
  const s = p.spec;
  const evals = evalTests(s);
  const uncovered = s.requirements.filter((r) => !s.tests.some((t) => t.reqIds.includes(r.id)));
  const set = (id: string, patch: Partial<TestCase>) => store.spec(p.id, (x) => ({ ...x, tests: x.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const add = (reqId: string) => store.spec(p.id, (x) => ({ ...x, tests: [...x.tests, { id: nextId('TC', x.tests.map((t) => t.id)), reqIds: [reqId], title: 'New test case', gherkin: 'Given …\nWhen …\nThen …', type: 'Manual', status: 'Not run' }] }));

  return (
    <div className="stack gap-xl">
      <PageHead over="Stage 3 · Test cases · owner: QA" title="Test cases" sub="Every requirement needs at least one test. CI runs compass/check-spec.mjs to enforce this traceability on every pull request." />
      <AgentBox p={p} agentId="testdesign" cta="Design test cases" defaultGoal={`Design test cases for ${uncovered.map((r) => r.id).join(', ') || 'all requirements'}`} disabled={!s.requirements.length ? 'Create requirements first.' : !uncovered.length ? 'Every requirement already has tests — add more manually, or ask with a specific goal.' : undefined} />

      {s.requirements.length > 0 && (
        <div className="card row gap-lg wrap">
          <span className="label-md">Test quality <span className="score t-brand">{pct(evals)}%</span></span>
          {evals.map((e) => <span key={e.id} className="body-sm"><span className="score">{e.score}/{e.max}</span> {e.name}</span>)}
        </div>
      )}

      <section className="stack gap-md">
        <h2 className="h3">Traceability matrix</h2>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th style={{ width: '28%' }}>Requirement</th><th>Test cases</th><th style={{ width: 90 }} /></tr></thead>
          <tbody>{s.requirements.map((r) => {
            const tcs = s.tests.filter((t) => t.reqIds.includes(r.id));
            return (
              <tr key={r.id}>
                <td><span className="mono t-brand">{r.id}</span> {r.title}<div><Badge tone={r.status === 'Done' ? 'success' : r.status === 'Draft' ? 'warning' : 'brand'}>{r.status}</Badge></div></td>
                <td>{tcs.length ? <div className="stack gap-sm">{tcs.map((t) => (
                  <div key={t.id} className="stack gap-xs">
                    <div className="row gap-sm wrap"><span className="mono t-brand">{t.id}</span><input className="input" style={{ padding: '2px 8px', fontSize: 13, maxWidth: 360 }} value={t.title} onChange={(e) => set(t.id, { title: e.target.value })} />
                      <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }} value={t.type} onChange={(e) => set(t.id, { type: e.target.value as TestCase['type'] })}><option>Automated</option><option>Manual</option></select>
                      <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }} value={t.status} onChange={(e) => set(t.id, { status: e.target.value as TestCase['status'] })}><option>Not run</option><option>Pass</option><option>Fail</option></select>
                      <button className="btn danger sm" aria-label={`Delete ${t.id}`} onClick={() => confirm(`Delete ${t.id} "${t.title}"?`) && store.spec(p.id, (x) => ({ ...x, tests: x.tests.filter((y) => y.id !== t.id) }))}>Delete</button></div>
                    <textarea className="textarea mono" style={{ minHeight: 64, fontSize: 12 }} value={t.gherkin} onChange={(e) => set(t.id, { gherkin: e.target.value })} />
                  </div>))}</div> : <Badge tone="danger">Not covered</Badge>}</td>
                <td><Button size="sm" variant="ghost" onClick={() => add(r.id)}>+ Test</Button></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>
    </div>
  );
}
