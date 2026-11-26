import { useEffect, useState, type CSSProperties } from 'react';
import { go } from '../App';
import { computeFloor, type Desk, type DeskState, type Handoff } from '../teamFloor';
import type { AgentId, Project } from '../types';
import { ago, Badge, PageHead, type Tone } from '../ui';

/** Team floor (F-009): the agent team at work, live. A view of the run trace only — it never starts or approves anything. */

const STATE: Record<DeskState, { label: string; tone: Tone }> = {
  idle: { label: 'Idle', tone: 'neutral' },
  working: { label: 'Working', tone: 'info' },
  waiting: { label: 'Waiting for you', tone: 'accent' },
  done: { label: '✓ Handed off', tone: 'success' },
  rework: { label: 'Rework', tone: 'danger' },
};
/** Column of each desk on the desktop floor (the bottom row runs back from Coding to Release). */
const COL: Record<AgentId, number> = { ideation: 0, requirements: 1, designer: 2, testdesign: 3, coder: 3, reviewer: 2, release: 1 };

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

function DeskCard({ p, d }: { p: Project; d: Desk }) {
  const s = STATE[d.state];
  const label = `${d.name} (${d.role}), ${s.label.replace('✓ ', '')}${d.featureId ? `, on ${d.featureId}` : ''}${d.bubble ? `: ${d.bubble}` : ''}${d.runId ? '. Open run' : ''}`;
  return (
    <button className={`desk desk-${d.agent} is-${d.state}`} aria-label={label} aria-disabled={!d.runId} onClick={() => d.runId && go(`/p/${p.id}/runs/${d.runId}`)}>
      <span className="desk-bubble" aria-hidden title={d.bubble}>{d.bubble ? <span>{d.bubble}</span> : null}</span>
      <span className="desk-card" aria-hidden>
        <span className={`agent-fig ${d.phase}`}><span className={`agent-head ${d.phase}`}>{d.role}</span><span className="agent-body" /></span>
        <span className="desk-table" />
        <span className="h4 desk-name">{d.name}</span>
        <span className="row gap-xs center wrap"><Badge>{d.role}</Badge><Badge tone={s.tone}>{s.label}</Badge></span>
        <span className="mono-sm t-tertiary">{d.featureId || '—'}</span>
      </span>
    </button>
  );
}

function HandoffCard({ h }: { h: Handoff }) {
  const style = { '--from-x': `${(COL[h.from] + 0.5) * 25}%`, '--to-x': `${(COL[h.to] + 0.5) * 25}%` } as CSSProperties;
  return <span className={`handoff ${h.kind}`} style={style} role="status">{h.kind === 'back' ? '↩ ' : '📄 '}{h.label}</span>;
}

export function TeamFloorPage({ p }: { p: Project }) {
  const [filter, setFilter] = useState('all');
  const [paused, setPaused] = useState(false);
  const [, tick] = useState(0);
  const phone = useMedia('(max-width: 719px)');
  const f = computeFloor(p, filter, Date.now());
  // Re-render once a second while a card is on its way, so it leaves the floor on time (no network, no agent work).
  const moving = f.handoffs.length > 0;
  useEffect(() => {
    if (!moving) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [moving]);
  const open = (runId: string) => go(`/p/${p.id}/runs/${runId}`);
  const features = p.spec.features.filter((x) => !x.archived);
  const desk = (a: AgentId) => f.desks.find((d) => d.agent === a)!;

  const approvalDesk = (
    <div className="desk-approval" role="group" aria-label="Your approval">
      <span className="h2" aria-hidden>✋</span>
      <span className="h4">Your approval</span>
      {f.approvals.length ? f.approvals.map((a) => (
        <span key={a.runId} className="stack gap-xs center">
          <span className="handoff-static">{a.agentName.replace(' agent', '')}{a.featureId ? ` · ${a.featureId}` : ''}</span>
          <button className="btn primary sm" onClick={() => open(a.runId)}>Review &amp; approve</button>
        </span>
      )) : <span className="body-sm t-tertiary">Nothing waiting 🎉</span>}
    </div>
  );

  return (
    <div className="stack gap-xl">
      <PageHead over={`${p.name} · agents`} title="Team floor" sub="Watch the agent team work, live. Click a desk to open its run."
        right={<div className="row gap-sm wrap">
          <Badge tone="success">● Live</Badge>{p.demo && <Badge>demo mode</Badge>}
          <select className="select" style={{ width: 'auto', maxWidth: 240 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Feature">
            <option value="all">All features</option>{features.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.name}</option>)}
          </select>
          <button className="btn secondary sm" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? '▶ Play motion' : '⏸ Pause motion'}</button>
        </div>} />

      {f.approvals.length > 0 && (
        <div className="floor-banner" role="status">
          <span className="h3" aria-hidden>✋</span>
          <span className="grow stack"><strong className="body-sm">{f.approvals.length} waiting for your approval</strong><span className="body-sm t-accent">{f.approvals[0].agentName.replace(' agent', '')}{f.approvals[0].featureId ? ` · ${f.approvals[0].featureId}` : ''}</span></span>
          <button className="btn primary sm" onClick={() => open(f.approvals[0].runId)}>Review</button>
        </div>
      )}

      <div className="row gap-sm wrap">
        <span className="floor-chip tone-info"><strong className="h3">{f.summary.working}</strong> agent{f.summary.working === 1 ? '' : 's'} working</span>
        <span className="floor-chip tone-accent"><strong className="h3">{f.summary.waiting}</strong> waiting for your approval</span>
        <span className="floor-chip"><strong className="h3">{f.summary.featuresInFlight.length}</strong> feature{f.summary.featuresInFlight.length === 1 ? '' : 's'} in flight{f.summary.featuresInFlight.length ? ` · ${f.summary.featuresInFlight.join(', ')}` : ''}</span>
      </div>

      <div className="floor-layout">
        <section className={`floor${paused ? ' paused' : ''}`} aria-label="Agent desks">
          <div className="floor-grid">
            {(['ideation', 'requirements', 'designer', 'testdesign', 'coder', 'reviewer', 'release'] as AgentId[]).map((a) => <DeskCard key={a} p={p} d={desk(a)} />)}
            <div className="floor-corridor" aria-hidden={!f.handoffs.length}>{f.handoffs.map((h) => <HandoffCard key={h.id} h={h} />)}</div>
            {approvalDesk}
          </div>
        </section>

        <details className="card floor-activity" open={!phone} key={phone ? 'phone' : 'desktop'}>
          <summary className="overline t-tertiary">Live activity</summary>
          {f.activity.length ? (
            <ul aria-live="polite" className="stack gap-sm">
              {f.activity.map((a) => (
                <li key={a.id}><button className="activity-row" onClick={() => open(a.runId)}>
                  <span className="mono-sm t-tertiary">{ago(a.t)}</span>
                  <span className="stack"><strong className="body-sm">{a.agentName}</strong><span className="body-sm t-secondary">{a.title}</span></span>
                </button></li>
              ))}
            </ul>
          ) : <p className="body-sm t-tertiary">No agent has run yet{filter !== 'all' ? ' for this feature' : ''}.</p>}
        </details>
      </div>
    </div>
  );
}
