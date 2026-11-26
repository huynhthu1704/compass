/**
 * Team floor (F-009, REQ-005 … REQ-009): turns the run trace Compass already records into the floor view —
 * one desk per agent, summary counts, approvals, live activity and recent handoffs.
 * Pure: no React, no storage, no network. Imports types only, so Node runs it directly in the tests.
 */
import type { AgentId, Project, Run, TraceStep } from './types.ts';

export type DeskState = 'idle' | 'working' | 'waiting' | 'done' | 'rework';

export interface Desk {
  agent: AgentId;
  name: string;
  role: string;
  /** design-system stage colour of the agent (phase-* class) */
  phase: string;
  state: DeskState;
  featureId?: string;
  bubble?: string;
  /** run opened when the desk is clicked */
  runId?: string;
}
export interface Handoff { id: string; from: AgentId; to: AgentId; kind: 'forward' | 'back'; label: string; at: number }
export interface Activity { id: string; t: string; agentName: string; title: string; runId: string }
export interface Approval { runId: string; agent: AgentId; agentName: string; featureId?: string; goal: string; blocked: boolean }
export interface Floor {
  desks: Desk[];
  summary: { working: number; waiting: number; featuresInFlight: string[] };
  approvals: Approval[];
  activity: Activity[];
  handoffs: Handoff[];
}

/** Pipeline order: top row left → right, then the bottom row back from Coding to Release. */
export const PIPELINE: { agent: AgentId; name: string; role: string; phase: string }[] = [
  { agent: 'ideation', name: 'Ideation agent', role: 'PO', phase: 'phase-discover' },
  { agent: 'requirements', name: 'Requirements agent', role: 'BA', phase: 'phase-define' },
  { agent: 'designer', name: 'Design agent', role: 'UX', phase: 'phase-design' },
  { agent: 'testdesign', name: 'Test design agent', role: 'QA', phase: 'phase-monitor' },
  { agent: 'coder', name: 'Coding agent', role: 'Dev', phase: 'phase-build' },
  { agent: 'reviewer', name: 'Review agent', role: 'QA', phase: 'phase-build' },
  { agent: 'release', name: 'Release agent', role: 'DM', phase: 'phase-release' },
];
const NEXT: Partial<Record<AgentId, AgentId>> = { ideation: 'requirements', requirements: 'designer', designer: 'testdesign', testdesign: 'coder', coder: 'release' };
/** How long a handoff card stays on the floor after the event (ms). */
export const HANDOFF_MS = 4000;

const nameOf = (a: AgentId) => PIPELINE.find((x) => x.agent === a)?.name ?? a;
const last = (r: Run): TraceStep | undefined => r.steps[r.steps.length - 1];
const time = (s: string) => Date.parse(s);
const blocked = (r: Run) => r.guardrails.some((g) => g.level === 'block');
/** A guardrail/eval step of the review of a change set ("G2 Traceability: BLOCK", "Evaluation: …"), not the
 *  prompt-injection scan that starts every run. */
const reviewStep = (s?: TraceStep) => !!s && (s.kind === 'eval' || (s.kind === 'guardrail' && /^G\d+ .*: (PASS|WARN|BLOCK)$/.test(s.title)));

function stateOf(r: Run | undefined): DeskState {
  if (!r) return 'idle';
  if (r.agent === 'coder' && blocked(r) && r.status !== 'approved' && r.status !== 'done') return 'rework';
  switch (r.status) {
    case 'running': return 'working';
    case 'awaiting-approval': return 'waiting';
    case 'approved': case 'done': return 'done';
    default: return 'rework';
  }
}

function bubbleOf(r: Run | undefined, state: DeskState): string | undefined {
  if (!r) return undefined;
  if (state === 'working') return last(r)?.title;
  if (state === 'waiting') return `Please approve: ${r.goal}`;
  if (state === 'rework') {
    const g = r.guardrails.find((x) => x.level === 'block');
    return g ? `Fixing: ${g.name}` : last(r)?.title;
  }
  return undefined;
}

/**
 * @param featureFilter 'all' or a feature id (REQ-005: only that feature's runs set the desks)
 * @param now current time in ms (handoffs are the events of the last HANDOFF_MS)
 */
export function computeFloor(p: Pick<Project, 'runs' | 'releases'>, featureFilter: string, now: number): Floor {
  const runs = p.runs.filter((r) => featureFilter === 'all' || r.featureId === featureFilter);
  const latest = (a: AgentId) => runs.filter((r) => r.agent === a).sort((x, y) => time(y.startedAt) - time(x.startedAt))[0];

  const desks: Desk[] = PIPELINE.map((d) => {
    const base = { agent: d.agent, name: d.name, role: d.role, phase: d.phase };
    if (d.agent === 'reviewer') {
      // The Review agent scores the Coding agent's change set inside the Coding run.
      const c = latest('coder');
      if (!c) return { ...base, state: 'idle' as const };
      const step = last(c);
      if (c.status === 'running' && reviewStep(step)) return { ...base, state: 'working' as const, featureId: c.featureId, bubble: step?.title, runId: c.id };
      if (c.guardrails.some((g) => g.id !== 'G0')) return { ...base, state: 'done' as const, featureId: c.featureId, runId: c.id };
      return { ...base, state: 'idle' as const };
    }
    if (d.agent === 'release') {
      const rel = [...p.releases].sort((x, y) => time(y.date) - time(x.date));
      const hit = featureFilter === 'all'
        ? rel[0] && runs.every((r) => time(rel[0].date) > time(r.startedAt)) ? rel[0] : undefined
        : rel.find((x) => x.featureIds?.includes(featureFilter));
      return { ...base, state: hit ? 'done' as const : 'idle' as const, featureId: hit ? (featureFilter === 'all' ? hit.featureIds?.[0] : featureFilter) : undefined };
    }
    const r = latest(d.agent);
    const state = stateOf(r);
    return { ...base, state, featureId: r?.featureId, bubble: bubbleOf(r, state), runId: r?.id };
  });

  const waitingRuns = runs.filter((r) => r.status === 'awaiting-approval').sort((x, y) => time(x.startedAt) - time(y.startedAt));
  const inFlight = [...new Set(runs.filter((r) => r.status === 'running' || r.status === 'awaiting-approval').map((r) => r.featureId).filter((x): x is string => !!x))].sort();

  const activity: Activity[] = runs
    .flatMap((r) => r.steps.map((s, i) => ({ id: `${r.id}:${i}`, t: s.t, agentName: nameOf(r.agent), title: s.title, runId: r.id })))
    .sort((x, y) => time(y.t) - time(x.t))
    .slice(0, 12);

  const recent = (s: TraceStep) => now - time(s.t) >= 0 && now - time(s.t) < HANDOFF_MS;
  const handoffs: Handoff[] = [];
  for (const r of runs) {
    const label = r.reqIds?.length ? r.reqIds.join(', ') : r.featureId || r.goal;
    for (const s of r.steps) {
      if (!recent(s)) continue;
      const to = NEXT[r.agent];
      if (s.kind === 'approval' && s.ok === true && to) handoffs.push({ id: `${r.id}:${s.t}:f`, from: r.agent, to, kind: 'forward', label, at: time(s.t) });
      if (r.agent === 'coder' && s.kind === 'guardrail' && /: BLOCK$/.test(s.title)) {
        const n = r.guardrails.filter((g) => g.level === 'block').length || 1;
        handoffs.push({ id: `${r.id}:${s.t}:b`, from: 'reviewer', to: 'coder', kind: 'back', label: `${n} finding${n === 1 ? '' : 's'}`, at: time(s.t) });
      }
    }
  }

  return {
    desks,
    summary: { working: desks.filter((d) => d.state === 'working').length, waiting: waitingRuns.length, featuresInFlight: inFlight },
    approvals: waitingRuns.map((r) => ({ runId: r.id, agent: r.agent, agentName: nameOf(r.agent), featureId: r.featureId, goal: r.goal, blocked: blocked(r) })),
    activity,
    handoffs,
  };
}
