import { useState } from 'react';
import { AgentBox } from '../components/AgentBox';
import { evalRequirements, pct } from '../guardrails';
import { featureOf } from '../spec';
import { nextId, store } from '../store';
import type { Project, Requirement } from '../types';
import { Badge, Button, Field, PageHead } from '../ui';

const STATUS_TONE = { Draft: 'warning', Approved: 'brand', 'In build': 'info', Done: 'success' } as const;

export function RequirementsPage({ p, fid }: { p: Project; fid: string }) {
  const f = featureOf(p, fid);
  const reqs = p.spec.requirements.filter((r) => r.featureId === fid);
  const [open, setOpen] = useState<string | null>(null);
  const evals = evalRequirements(reqs);
  const set = (id: string, patch: Partial<Requirement>) => store.spec(p.id, (s) => ({ ...s, requirements: s.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const drafts = reqs.filter((r) => r.status === 'Draft');
  const add = () => { const id = nextId('REQ', p.spec.requirements.map((r) => r.id)); store.spec(p.id, (s) => ({ ...s, requirements: [...s.requirements, { id, featureId: fid, title: 'New requirement', story: 'As a …, I want …, so that …', ac: ['Given …\nWhen …\nThen …'], priority: 'Should', status: 'Draft' }] })); setOpen(id); };

  return (
    <div className="stack gap-xl">
      <PageHead over={`${f?.id} ${f?.name} · Stage 2 · Requirements · owner: BA / PO`} title="Requirements" sub="User stories with Given/When/Then acceptance criteria. Only Approved requirements can be built."
        right={<>{drafts.length > 0 && <Button variant="secondary" onClick={() => store.spec(p.id, (s) => ({ ...s, requirements: s.requirements.map((r) => (r.featureId === fid && r.status === 'Draft' ? { ...r, status: 'Approved' } : r)) }))}>Approve all drafts ({drafts.length})</Button>}<Button variant="ghost" onClick={add}>+ Add manually</Button></>} />
      <AgentBox p={p} agentId="requirements" featureId={fid} cta="Generate requirements" defaultGoal={`Write requirements for: ${f?.idea.scopeIn.join('; ') || f?.idea.intent || ''}`} disabled={!f?.idea.intent ? 'Set the business intent in the Idea stage first.' : undefined} />

      {reqs.length > 0 && (
        <div className="card row gap-lg wrap">
          <span className="label-md">Quality score <span className="score t-brand">{pct(evals)}%</span></span>
          {evals.map((e) => <span key={e.id} className="body-sm"><span className="score">{e.score}/{e.max}</span> {e.name}</span>)}
        </div>
      )}

      {!reqs.length ? <div className="empty">No requirements yet — ask the agent or add one manually.</div> : (
        <div className="stack gap-sm">
          {reqs.map((r) => {
            const tcs = p.spec.tests.filter((t) => t.reqIds.includes(r.id));
            return (
              <div key={r.id} className="card stack gap-sm">
                <div className="row gap-sm wrap">
                  <span className="mono t-brand">{r.id}</span>
                  <button className="btn ghost sm" style={{ padding: 0, fontWeight: 600, color: 'var(--color-text-primary)' }} onClick={() => setOpen(open === r.id ? null : r.id)}>{r.title}</button>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  <Badge>{r.priority}</Badge>
                  <Badge tone={tcs.length ? 'info' : 'danger'}>{tcs.length ? tcs.map((t) => t.id).join(', ') : 'no tests'}</Badge>
                  <span className="grow" />
                  {r.status === 'Draft' && <Button size="sm" variant="secondary" onClick={() => set(r.id, { status: 'Approved' })}>Approve</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Close' : 'Edit'}</Button>
                </div>
                {open !== r.id ? <div className="body-sm t-secondary">{r.story}</div> : (
                  <div className="stack gap-md">
                    <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                      <Field label="Title"><input className="input" value={r.title} onChange={(e) => set(r.id, { title: e.target.value })} /></Field>
                      <Field label="Priority"><select className="select" value={r.priority} onChange={(e) => set(r.id, { priority: e.target.value as Requirement['priority'] })}><option>Must</option><option>Should</option><option>Could</option></select></Field>
                      <Field label="Status"><select className="select" value={r.status} onChange={(e) => set(r.id, { status: e.target.value as Requirement['status'] })}><option>Draft</option><option>Approved</option><option>In build</option><option>Done</option></select></Field>
                    </div>
                    <Field label="User story"><textarea className="textarea" style={{ minHeight: 60 }} value={r.story} onChange={(e) => set(r.id, { story: e.target.value })} /></Field>
                    {r.ac.map((a, i) => (
                      <Field key={i} label={`Acceptance criterion ${i + 1}`}>
                        <textarea className="textarea mono" style={{ minHeight: 76, fontSize: 13 }} value={a} onChange={(e) => set(r.id, { ac: r.ac.map((x, j) => (j === i ? e.target.value : x)) })} />
                      </Field>
                    ))}
                    <div className="row gap-sm">
                      <Button size="sm" variant="ghost" onClick={() => set(r.id, { ac: [...r.ac, 'Given …\nWhen …\nThen …'] })}>+ Acceptance criterion</Button>
                      <Button size="sm" variant="danger" onClick={() => confirm(`Delete ${r.id}?`) && store.spec(p.id, (s) => ({ ...s, requirements: s.requirements.filter((x) => x.id !== r.id) }))}>Delete</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
