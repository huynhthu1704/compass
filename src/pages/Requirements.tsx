import { useState } from 'react';
import { AgentBox } from '../components/AgentBox';
import { evalRequirements, pct } from '../guardrails';
import { featureOf } from '../spec';
import { autoAdvance } from '../harness';
import { nextId, now, store } from '../store';
import { recordApproval, useGate, useUnconfirmed } from '../approvals';
import type { Project, Requirement } from '../types';
import { Badge, Button, Field, PageHead, REQ_STATUS_TONE, toast } from '../ui';


export function RequirementsPage({ p, fid }: { p: Project; fid: string }) {
  const f = featureOf(p, fid);
  const reqs = p.spec.requirements.filter((r) => r.featureId === fid);
  const [open, setOpen] = useState<string | null>(null);
  const evals = evalRequirements(reqs);
  // Approving the last draft requirement starts the Design agent (requirements → design gate)
  const advance = () => { const m = autoAdvance(p.id, fid); if (m) toast(m); };
  const set = (id: string, patch: Partial<Requirement>) => { store.spec(p.id, (s) => ({ ...s, requirements: s.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)) })); if (patch.status && patch.status !== 'Draft') advance(); };
  const drafts = reqs.filter((r) => r.status === 'Draft');
  // F-015 REQ-033/036/037: PO or BA approve requirements; the approval is recorded in Firebase first.
  const gate = useGate(p, 'requirements');
  const unconfirmed = useUnconfirmed(p); // REQ-038: approvals Firebase does not confirm
  const [approving, setApproving] = useState(false);
  const approve = async (ids: string[], then?: Requirement['status']) => {
    if (approving) return;
    setApproving(true);
    try {
      const by = await recordApproval(p, 'requirements', ids);
      store.spec(p.id, (s) => ({ ...s, requirements: s.requirements.map((r) => (ids.includes(r.id) && r.status === 'Draft' ? { ...r, status: 'Approved', ...(by ? { approvedBy: by.text, approvedAt: now() } : {}) } : r)) }));
      if (then && then !== 'Approved') set(ids[0], { status: then });
      advance();
    } catch (e) { toast((e as Error).message); } finally { setApproving(false); }
  };
  /** The Status field: leaving Draft is an approval (gated and recorded); going back to Draft clears approvedBy. */
  const changeStatus = (r: Requirement, next: Requirement['status']) => {
    if (next === r.status) return;
    if (r.status === 'Draft') { void approve([r.id], next); return; }
    set(r.id, next === 'Draft' ? { status: 'Draft', approvedBy: undefined, approvedAt: undefined } : { status: next });
  };
  const add = () => { const id = nextId('REQ', p.spec.requirements.map((r) => r.id)); store.spec(p.id, (s) => ({ ...s, requirements: [...s.requirements, { id, featureId: fid, title: 'New requirement', story: 'As a …, I want …, so that …', ac: ['Given …\nWhen …\nThen …'], priority: 'Should', status: 'Draft' }] })); setOpen(id); };

  return (
    <div className="stack gap-xl">
      <PageHead over={`${f?.id} ${f?.name} · Stage 2 · Requirements · owner: BA / PO`} title="Requirements" sub="User stories with Given/When/Then acceptance criteria. Once every requirement is approved, the Design agent drafts the screens — coding waits for the approved design."
        right={<>{drafts.length > 0 && !gate.allowed && <span id="req-gate-hint" className="body-sm t-tertiary">{gate.hint}</span>}{drafts.length > 0 && <Button variant="secondary" disabled={!gate.allowed || approving} aria-describedby={gate.allowed ? undefined : 'req-gate-hint'} onClick={() => void approve(drafts.map((r) => r.id))}>Approve all drafts ({drafts.length})</Button>}<Button variant="ghost" onClick={add}>+ Add manually</Button></>} />
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
                  <Badge tone={REQ_STATUS_TONE[r.status]}>{r.status}</Badge>
                  <Badge>{r.priority}</Badge>
                  <Badge tone={tcs.length ? 'info' : 'danger'}>{tcs.length ? tcs.map((t) => t.id).join(', ') : 'no tests'}</Badge>
                  <span className="grow" />
                  {r.status === 'Draft' && <Button size="sm" variant="secondary" disabled={!gate.allowed || approving} aria-describedby={gate.allowed ? undefined : `hint-${r.id}`} aria-label={`Approve ${r.id}`} onClick={() => void approve([r.id])}>Approve</Button>}
                  {r.status === 'Draft' && !gate.allowed && <span id={`hint-${r.id}`} className="body-sm t-tertiary">{gate.hint}</span>}
                  {r.approvedBy && <span className="body-sm t-tertiary">Approved by {r.approvedBy}</span>}
                  {unconfirmed.some((u) => u.item === r.id) && <Badge tone="danger" title="No Firebase record confirms this approval">Unconfirmed — claims {r.approvedBy || 'no approver'}</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Close' : 'Edit'}</Button>
                </div>
                {open !== r.id ? <div className="body-sm t-secondary">{r.story}</div> : (
                  <div className="stack gap-md">
                    <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                      <Field label="Title"><input className="input" value={r.title} onChange={(e) => set(r.id, { title: e.target.value })} /></Field>
                      <Field label="Priority"><select className="select" value={r.priority} onChange={(e) => set(r.id, { priority: e.target.value as Requirement['priority'] })}><option>Must</option><option>Should</option><option>Could</option></select></Field>
                      <Field label="Status"><select className="select" value={r.status} disabled={!gate.allowed || approving} aria-describedby={gate.allowed ? undefined : `hint-${r.id}`} onChange={(e) => changeStatus(r, e.target.value as Requirement['status'])}><option>Draft</option><option>Approved</option><option>In build</option><option>Done</option></select></Field>
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
