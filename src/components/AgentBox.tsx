import { useState, type ReactNode } from 'react';
import { agent, startRun } from '../harness';
import { useStore } from '../store';
import type { AgentId, Project } from '../types';
import { Badge, Button } from '../ui';
import { RunView } from './RunView';

/** "Ask the agent" panel used on each pipeline stage, with the latest run of that agent inline. */
/** `children` (REQ-113: the Idea page's attachments) sit between the instruction and the run button. */
export function AgentBox({ p, agentId, featureId, defaultGoal, placeholder, reqIds, cta, disabled, hint, children }: { p: Project; agentId: AgentId; featureId?: string; defaultGoal: string; placeholder?: string; reqIds?: string[]; cta: string; disabled?: string; hint?: string; children?: ReactNode }) {
  const { settings } = useStore();
  const a = agent(agentId);
  const [goal, setGoal] = useState(defaultGoal);
  const [busy, setBusy] = useState(false);
  const runs = p.runs.filter((r) => r.agent === agentId && (!featureId || r.featureId === featureId));
  const latest = runs[0];
  const live = !!settings.apiKey && !p.demo;

  const go = async () => { setBusy(true); try { await startRun(p.id, agentId, goal.trim() || defaultGoal, { reqIds, featureId }); } finally { setBusy(false); } };

  return (
    <section className="card pad-xl stack gap-md" style={{ background: 'var(--color-bg-brand-subtle)', borderColor: 'transparent' }}>
      <div className="row gap-sm wrap">
        <span className="h4">✦ {a.name}</span>
        <Badge tone={live ? 'brand' : 'neutral'}>{live ? `live · ${settings.model}` : 'demo mode'}</Badge>
        <span className="body-sm t-secondary">{a.purpose}</span>
      </div>
      {children ? <>
        <textarea className="textarea" style={{ minHeight: 64 }} value={goal} placeholder={placeholder} onChange={(e) => setGoal(e.target.value)} aria-label="Instruction for the agent" />
        {children}
        <div className="row"><Button variant="accent" disabled={busy || !!disabled || latest?.status === 'running'} onClick={go}>{busy ? 'Agent working…' : cta}</Button></div>
      </> : <div className="row gap-sm wrap start">
        <textarea className="textarea grow" style={{ minHeight: 64, minWidth: 260 }} value={goal} placeholder={placeholder} onChange={(e) => setGoal(e.target.value)} aria-label="Instruction for the agent" />
        <Button variant="accent" disabled={busy || !!disabled || latest?.status === 'running'} onClick={go}>{busy ? 'Agent working…' : cta}</Button>
      </div>}
      <div className="mono-sm t-tertiary">Tools: {a.tools.filter((t) => t !== 'finish').join(' · ') || '—'} · Gate: {a.gate}{!live && ' · add an Anthropic key in Connections for live runs'}</div>
      {disabled && <div className="body-sm t-accent">{disabled}</div>}
      {hint && !disabled && <div className="body-sm t-secondary">{hint}</div>}
      {latest && (latest.status === 'running' || latest.status === 'awaiting-approval' || latest.status === 'failed') && <div className="card"><RunView key={latest.id} p={p} r={latest} compact /></div>}
    </section>
  );
}
