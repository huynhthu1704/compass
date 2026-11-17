import { useState } from 'react';
import { go } from '../App';
import { store, today, uid } from '../store';
import type { ChangeEntry, Project } from '../types';
import { Badge, Button, Field, PageHead, PhaseChip } from '../ui';

const CHECKS = [
  ['stories', 'All Must stories accepted by the PO'],
  ['uat', 'UAT signed off by business owner'],
  ['events', 'Tracking events verified in production'],
  ['support', 'Support trained, FAQ published'],
  ['rollback', 'Rollback / feature flag tested'],
  ['comms', 'User & stakeholder comms scheduled'],
  ['oncall', 'On-call and incident path agreed'],
];

const TYPE_TONE = { release: 'success', change: 'info', experiment: 'accent', rollback: 'danger' } as const;

export function ReleasePage({ p }: { p: Project }) {
  const [form, setForm] = useState<Omit<ChangeEntry, 'id'>>({ date: today(), title: '', type: p.changelog.some((c) => c.type === 'release') ? 'change' : 'release', rollout: 5 });
  const log = [...p.changelog].sort((a, b) => b.date.localeCompare(a.date));
  const rollout = log[0]?.rollout ?? 0;
  const done = CHECKS.filter(([k]) => p.checklist[k]).length;
  const plans = p.artefacts.filter((a) => ['release-plan', 'rollout-plan', 'raid-log', 'uat-plan', 'comms-training', 'test-scenarios'].includes(a.actionId));

  const add = () => {
    if (!form.title.trim()) return;
    store.updateProject(p.id, (x) => ({ ...x, changelog: [...x.changelog, { ...form, id: uid() }] }));
    setForm({ ...form, title: '', type: 'change' });
  };

  return (
    <div className="stack gap-xl">
      <PageHead over="Build → Release" title="Plan & Release" sub="Plan delivery, decide go / no-go, and log every rollout step. The change log annotates your Monitor charts so you can see cause and effect." />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pad-xl stack gap-md">
          <div className="row between"><h2 className="h3">Go / no-go</h2><Badge tone={done === CHECKS.length ? 'success' : 'warning'}>{done}/{CHECKS.length}</Badge></div>
          {CHECKS.map(([k, l]) => (
            <label key={k} className="row gap-sm" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={!!p.checklist[k]} onChange={(e) => store.updateProject(p.id, (x) => ({ ...x, checklist: { ...x.checklist, [k]: e.target.checked } }))} />
              <span className="body-sm">{l}</span>
            </label>
          ))}
          <div className={`panel body-sm ${done === CHECKS.length ? 't-success' : 't-secondary'}`}>{done === CHECKS.length ? 'Ready to go — log the release below.' : 'Not ready yet — complete the checklist before increasing rollout.'}</div>
        </section>

        <section className="card pad-xl stack gap-md">
          <h2 className="h3">Rollout</h2>
          <div className="row gap-md"><span className="kpi"><span className="v">{rollout}%</span></span><span className="body-sm t-tertiary">of users have the feature (latest log entry)</span></div>
          <div className="progress" style={{ height: 10 }}><span style={{ width: `${rollout}%`, background: 'var(--color-phase-release-fg)' }} /></div>
          <div className="row gap-xs wrap">{[0, 5, 25, 50, 100].map((n) => <Badge key={n} tone={rollout >= n ? 'success' : 'neutral'}>{n}%</Badge>)}</div>
          <h3 className="h4" style={{ marginTop: 8 }}>Plans</h3>
          {plans.length ? plans.map((a) => <button key={a.id} className="option" onClick={() => go(`/p/${p.id}/a/${a.id}`)}><PhaseChip phase={a.phase} /><span className="label-md">{a.title}</span></button>)
            : <div className="body-sm t-tertiary">No delivery plans yet.</div>}
          <div className="row gap-sm wrap">
            <Button size="sm" variant="secondary" onClick={() => go(`/p/${p.id}/actions?phase=build`)}>Build actions</Button>
            <Button size="sm" variant="secondary" onClick={() => go(`/p/${p.id}/actions?phase=release`)}>Release actions</Button>
          </div>
        </section>
      </div>

      <section className="stack gap-md">
        <h2 className="h3">Change log</h2>
        <div className="card stack gap-md">
          <div className="grid-2" style={{ gridTemplateColumns: '150px 1fr 150px 110px auto', alignItems: 'end', gap: 12 }}>
            <Field label="Date"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="What changed"><input className="input" value={form.title} placeholder="e.g. Guest checkout to 25%" onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} /></Field>
            <Field label="Type"><select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ChangeEntry['type'] })}><option value="release">Release</option><option value="change">Change</option><option value="experiment">Experiment</option><option value="rollback">Rollback</option></select></Field>
            <Field label="Rollout %"><input className="input" type="number" min={0} max={100} value={form.rollout} onChange={(e) => setForm({ ...form, rollout: Math.max(0, Math.min(100, +e.target.value)) })} /></Field>
            <Button onClick={add} disabled={!form.title.trim()}>Log</Button>
          </div>
        </div>
        {log.length ? (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Change</th><th>Rollout</th><th /></tr></thead>
            <tbody>{log.map((c) => (
              <tr key={c.id}><td className="mono">{c.date}</td><td><Badge tone={TYPE_TONE[c.type]}>{c.type}</Badge></td><td>{c.title}</td><td className="mono">{c.rollout}%</td>
                <td><Button size="sm" variant="danger" onClick={() => store.updateProject(p.id, (x) => ({ ...x, changelog: x.changelog.filter((y) => y.id !== c.id) }))}>Remove</Button></td></tr>
            ))}</tbody>
          </table></div>
        ) : <div className="empty">Nothing logged yet. Logging the first release unlocks the Monitor phase.</div>}
      </section>
    </div>
  );
}
