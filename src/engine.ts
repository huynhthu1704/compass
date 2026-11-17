import { ACTIONS, isDone, type ActionDef } from './catalog';
import { PHASES, type MetricRow, type Phase, type Project, type Role } from './types';

export interface Suggestion {
  action: ActionDef;
  reason: string;
  score: number;
  recommended?: boolean;
  urgent?: boolean;
  blockedBy: string[];
}

// ---------- metrics analysis (also used by Monitor) ----------
export function weekly(rows: MetricRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = sorted.slice(-7), prev7 = sorted.slice(-14, -7);
  const sum = (rs: MetricRow[], k: keyof MetricRow) => rs.reduce((s, r) => s + Number(r[k] || 0), 0);
  const cur = { exposed: sum(last7, 'exposed'), tried: sum(last7, 'tried'), activated: sum(last7, 'activated'), retained: sum(last7, 'retained') };
  const prev = { exposed: sum(prev7, 'exposed'), tried: sum(prev7, 'tried'), activated: sum(prev7, 'activated'), retained: sum(prev7, 'retained') };
  const wow = prev.activated ? ((cur.activated - prev.activated) / prev.activated) * 100 : 0;
  const activationRate = cur.exposed ? (cur.activated / cur.exposed) * 100 : 0;
  const tryRate = cur.exposed ? (cur.tried / cur.exposed) * 100 : 0;
  const retention = cur.activated ? (cur.retained / cur.activated) * 100 : 0;
  return { cur, prev, wow, activationRate, tryRate, retention, hasPrev: prev7.length > 0 };
}

export function alertState(p: Project) {
  if (p.metrics.length < 14) return null;
  const w = weekly(p.metrics);
  if (w.wow <= -Math.abs(p.alertThreshold)) return { drop: w.wow };
  return null;
}

// ---------- next-action engine ----------
export function currentPhase(p: Project): Phase {
  // the earliest phase that still has an important open action
  const core: Record<Phase, string[]> = {
    discover: ['problem-statement', 'stakeholder-map', 'success-metrics'],
    define: ['scope', 'requirements'],
    design: ['tracking-plan', 'ux-brief'],
    build: ['user-stories', 'release-plan'],
    release: ['rollout-plan'],
    monitor: ['kpi-review'],
  };
  if (p.changelog.some((c) => c.type === 'release')) return 'monitor';
  for (const ph of PHASES) if (core[ph].some((id) => !isDone(p, id) && !p.skipped.includes(id))) return ph;
  return 'monitor';
}

export function phaseProgress(p: Project, ph: Phase) {
  const list = ACTIONS.filter((a) => a.phase === ph && !(a.heavy && p.size === 'small'));
  const done = list.filter((a) => isDone(p, a.id)).length;
  return { done, total: list.length };
}

export function suggest(p: Project, role?: Role): Suggestion[] {
  const released = p.changelog.some((c) => c.type === 'release');
  const alert = alertState(p);
  const cur = currentPhase(p);
  const out: Suggestion[] = [];

  for (const a of ACTIONS) {
    if (isDone(p, a.id) || p.skipped.includes(a.id)) continue;
    const blockedBy = (a.requires || []).filter((r) => !isDone(p, r) && !p.skipped.includes(r));
    let score = PHASES.indexOf(a.phase) * 10 + ACTIONS.filter((x) => x.phase === a.phase).indexOf(a);
    let reason = a.why;
    let urgent = false;

    // realism rules
    if (a.heavy && p.size === 'small') { score += 60; reason = 'Optional for a small change — a lightweight artefact is usually enough.'; }
    if (a.heavy && p.size === 'large') score -= 3;
    if (role && a.owners.includes(role)) score -= 4;
    if (a.phase === cur) score -= 8;
    if (blockedBy.length) score += 25;

    // monitor actions only make sense after release
    if (a.phase === 'monitor' && !released) { score += 80; reason = 'Available after the first release is logged.'; }
    if (released && a.id === 'add-usage-data') { score = -50; urgent = true; reason = 'A release is logged but no usage data yet — you can\'t evaluate adoption.'; }
    if (released && a.id === 'tracking-plan') { score = -40; urgent = true; reason = 'Feature is live without a tracking plan — usage cannot be measured reliably.'; }
    if (a.id === 'kpi-review' && p.metrics.length) { score = alert ? -60 : -20; urgent = !!alert; reason = alert ? `Activations dropped ${Math.abs(alert.drop).toFixed(0)}% week-on-week — investigate now.` : 'Usage data is available — compare it with your targets.'; }
    if (a.id === 'feedback-interviews' && alert) { score = -45; urgent = true; reason = 'Usage is dropping — talk to users to learn why.'; }
    if (a.id === 'success-metrics' && isDone(p, 'scope') === false && p.answers.metric) reason = `You mentioned "${p.answers.metric}" — turn it into a baseline and target.`;
    if (a.id === 'stakeholder-map' && !p.answers.affected) reason = 'You haven\'t said who is affected yet — identify stakeholders before eliciting requirements.';
    if (a.id === 'root-cause' && p.stage !== 'Idea') score -= 2;
    if (a.id === 'as-is-process' && p.stage === 'Idea') score += 6;

    out.push({ action: a, reason, score, urgent, blockedBy });
  }
  out.sort((x, y) => x.score - y.score);
  const first = out.find((s) => !s.blockedBy.length && s.score < 80);
  if (first) first.recommended = true;
  return out;
}
