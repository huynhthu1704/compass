import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { go } from '../App';
import { computeFloor, type Approval, type Desk, type DeskState, type Handoff } from '../teamFloor';
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

function DeskCard({ p, d, ring }: { p: Project; d: Desk; ring?: 'forward' | 'back' }) {
  const s = STATE[d.state];
  const label = `${d.name} (${d.role}), ${s.label.replace('✓ ', '')}${d.featureId ? `, on ${d.featureId}` : ''}${d.bubble ? `: ${d.bubble}` : ''}${d.runId ? '. Open run' : ''}`;
  return (
    <button className={`desk desk-${d.agent} is-${d.state}${ring ? ` ring-${ring}` : ''}`} aria-label={label} aria-disabled={!d.runId} onClick={() => d.runId && go(`/p/${p.id}/runs/${d.runId}`)}>
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

/** One waiting item (REQ-060): agent · feature, waiting time, one line of the goal; opens its details (REQ-062). */
function ApprovalItem({ a, onOpen }: { a: Approval; onOpen: (a: Approval, el: HTMLElement) => void }) {
  // Feature first: on the narrow desk the end of this line may be cut, and the feature id matters most.
  const who = `${a.featureId ? `${a.featureId} · ` : ''}${a.agentName.replace(' agent', '')}`;
  return (
    <button className={`approval-item${a.blocked ? ' is-blocked' : ''}`} onClick={(e) => onOpen(a, e.currentTarget)}
      aria-label={`${who}, waiting ${a.wait === 'now' ? 'just now' : a.wait}${a.blocked ? ', blocked' : ''}: ${a.goal}. Show details`}>
      <span className="approval-top" aria-hidden><span className="mono-sm t-brand">{who}</span><span className="mono-sm t-tertiary">{a.wait}</span></span>
      <span className="approval-goal" aria-hidden title={a.goal}>{a.goal}</span>
      {a.blocked && <span aria-hidden><Badge tone="danger">blocked</Badge></span>}
    </button>
  );
}

/** Details of a waiting item (REQ-062). It only navigates to the run page — approving stays there (REQ-008). */
function ApprovalPanel({ a, onClose, open }: { a: Approval; onClose: () => void; open: (runId: string) => void }) {
  const head = useRef<HTMLHeadingElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  // Modal dialog: focus starts on the heading, Tab stays inside, Escape closes (same pattern as DeleteFeatureDialog, REQ-016).
  useEffect(() => {
    head.current?.focus();
    const focusables = () => (box.current ? [...box.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')].filter((el) => el.offsetParent !== null) : []);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1], at = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && at <= 0) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === -1 || at === items.length - 1)) { e.preventDefault(); first.focus(); }
    };
    const onFocus = (e: FocusEvent) => { if (box.current && !box.current.contains(e.target as Node)) head.current?.focus(); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => { document.removeEventListener('keydown', onKey, true); document.removeEventListener('focusin', onFocus); };
  }, []);
  const sel = a;
  return (
    <div className="drawer-backdrop approval-backdrop" onClick={onClose}>
      <div className="drawer approval-panel" ref={box} role="dialog" aria-modal="true" aria-labelledby="approval-title" onClick={(e) => e.stopPropagation()}>
        <div className="row between gap-sm approval-head">
          <button className="btn ghost sm approval-back" onClick={onClose}>← Back to floor</button>
          <h2 id="approval-title" className="h3" tabIndex={-1} ref={head}>{sel.agentName}{sel.featureId ? ` · ${sel.featureId}` : ''}</h2>
          <button className="btn ghost sm approval-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="row gap-xs wrap">
          {sel.blocked ? <Badge tone="danger">blocked</Badge> : <Badge tone="accent">Waiting for you</Badge>}
          <Badge>waiting {sel.wait === 'now' ? 'just now' : sel.wait}</Badge>
        </div>
        <section className="stack gap-xs"><h3 className="overline t-tertiary">Goal</h3><p className="body-sm">{sel.goal}</p></section>
        <section className="stack gap-xs"><h3 className="overline t-tertiary">Proposal</h3><p className="body-sm">{sel.proposal}</p></section>
        <section className="stack gap-xs"><h3 className="overline t-tertiary">Checks</h3>
          {sel.checks.length ? <ul className="approval-checks">{sel.checks.map((c) => <li key={c} className="body-sm">{c}</li>)}</ul> : <p className="body-sm t-tertiary">No checks recorded.</p>}
        </section>
        <p className="body-sm t-tertiary">Approve or reject on the run page — the same as from Agent runs.</p>
        <div className="row gap-sm wrap">
          <button className={`btn ${sel.blocked ? 'secondary' : 'primary'}`} onClick={() => open(sel.runId)}>{sel.blocked ? 'Open run · blocked' : 'Open run to approve'}</button>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
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
  const [sel, setSel] = useState<Approval | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const phone = useMedia('(max-width: 719px)');
  const f = computeFloor(p, filter, Date.now());
  // Re-render once a second while a card is on its way, so it leaves the floor on time (no network, no agent work).
  const moving = f.handoffs.length > 0;
  useEffect(() => {
    if (!moving) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [moving]);
  // Keep waiting times fresh while something waits (every 30 s; no network).
  const anyWaiting = f.approvals.length > 0;
  useEffect(() => {
    if (!anyWaiting) return;
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [anyWaiting]);
  const open = (runId: string) => go(`/p/${p.id}/runs/${runId}`);
  const showDetails = (a: Approval, el: HTMLElement) => { opener.current = el; setSel(a); };
  // Focus goes back to the item only after the panel has unmounted (its focus guard would pull it back in before that).
  const restore = useRef(false);
  const closeDetails = () => { restore.current = true; setSel(null); };
  useEffect(() => { if (!sel && restore.current) { restore.current = false; opener.current?.focus(); } }, [sel]);
  const current = sel && f.approvals.find((x) => x.runId === sel.runId);
  // If the open run stops waiting (approved or rejected elsewhere), close the panel properly instead of leaving it selected.
  const gone = !!sel && !current;
  useEffect(() => { if (gone) { restore.current = true; setSel(null); } }, [gone]);
  const moreLink = `/p/${p.id}/runs?status=awaiting-approval${filter !== 'all' ? `&feature=${filter}` : ''}`;
  const more = f.approvalsMore > 0 && (
    <button className="btn ghost sm" onClick={() => go(moreLink)}>+{f.approvalsMore} more → Agent runs</button>
  );
  const features = p.spec.features.filter((x) => !x.archived);
  const desk = (a: AgentId) => f.desks.find((d) => d.agent === a)!;

  const approvalDesk = (
    <div className="desk-approval" role="group" aria-label="Your approval">
      <span className="h4">✋ Your approval{f.approvals.length ? ` · ${f.approvals.length}` : ''}</span>
      {f.approvals.length ? f.approvalsShown.map((a) => <ApprovalItem key={a.runId} a={a} onOpen={showDetails} />) : <span className="body-sm t-tertiary">Nothing waiting 🎉</span>}
      {more}
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
        <div className="floor-banner" role="group" aria-label="Waiting for your approval">
          <strong className="body-sm">✋ {f.approvals.length} waiting for your approval</strong>
          {f.approvalsShown.map((a) => <ApprovalItem key={a.runId} a={a} onOpen={showDetails} />)}
          {more}
        </div>
      )}

      <div className="row gap-sm wrap">
        <span className="floor-chip tone-info"><strong className="h3">{f.summary.working}</strong> agent{f.summary.working === 1 ? '' : 's'} working</span>
        <span className="floor-chip tone-accent"><strong className="h3">{f.summary.waiting}</strong> waiting for your approval</span>
        <span className="floor-chip"><strong className="h3">{f.summary.featuresInFlight.length}</strong> feature{f.summary.featuresInFlight.length === 1 ? '' : 's'} in flight{f.summary.featuresInFlight.length ? ` · ${f.summary.featuresInFlight.join(', ')}` : ''}</span>
      </div>

      <div className="floor-layout">
        <section className={`floor${paused ? ' paused' : ''}`} aria-label="Agent desks">
          {f.strip.length > 0 && (
            <div className="handoff-strip" role="status">
              {f.strip.map((s) => (
                <div key={s.id} className={`strip-item ${s.kind}`}>
                  <span className="strip-lane">
                    {s.kind === 'back'
                      ? <><span className="label-sm">{s.toName}</span><span aria-hidden className="t-danger">←</span><span className="handoff-static strip-card">↩ {s.label}</span><span className="label-sm">{s.fromName}</span></>
                      : <><span className="label-sm">{s.fromName}</span><span className="handoff-static strip-card">📄 {s.label}</span><span aria-hidden className="t-brand">→</span><span className="label-sm">{s.toName}</span></>}
                  </span>
                  <span className="body-sm t-secondary">{s.sentence}</span>
                </div>
              ))}
            </div>
          )}
          <div className="floor-grid">
            {(['ideation', 'requirements', 'designer', 'testdesign', 'coder', 'reviewer', 'release'] as AgentId[]).map((a) => <DeskCard key={a} p={p} d={desk(a)} ring={f.strip.find((s) => s.toDesk === a)?.kind} />)}
            <div className="floor-corridor" aria-hidden={!f.handoffs.length}>{f.handoffs.map((h) => <HandoffCard key={h.id} h={h} />)}</div>
            {approvalDesk}
          </div>
        </section>

        <p className="sr-only" aria-live="polite">{f.activity[0] ? `${f.activity[0].agentName}: ${f.activity[0].title}` : ''}</p>
        <details className="card floor-activity" open={!phone} key={phone ? 'phone' : 'desktop'}>
          <summary className="overline t-tertiary">Live activity</summary>
          {f.activity.length ? (
            <ul className="stack gap-sm">
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
      {current && <ApprovalPanel a={current} onClose={closeDetails} open={open} />}
    </div>
  );
}
