import { useState } from 'react';
import { agent, approveRun, rejectRun } from '../harness';
import { blocked, pct } from '../guardrails';
import { store, useStore } from '../store';
import type { Project, Run, StepKind } from '../types';
import { ago, Badge, Button, Diff, Markdown, useAction } from '../ui';

const ICON: Record<StepKind, [string, string]> = { plan: ['◎', ''], retrieve: ['R', 'tool'], tool_call: ['ƒ', 'tool'], tool_result: ['↩', 'tool'], model: ['✦', 'model'], guardrail: ['G', ''], eval: ['E', 'model'], approval: ['✋', 'wait'], github: ['⎇', 'ok'], error: ['!', 'bad'] };
export const STATUS_TONE = { running: 'info', 'awaiting-approval': 'accent', approved: 'brand', rejected: 'neutral', failed: 'danger', done: 'success' } as const;

export function RunView({ p, r, compact }: { p: Project; r: Run; compact?: boolean }) {
  const a = agent(r.agent);
  const { busy, run } = useAction();
  const { settings } = useStore();
  const [open, setOpen] = useState<string | null>(r.changes[0]?.path || null);
  const [protOk, setProtOk] = useState(false);
  const isBlocked = blocked(r.guardrails);
  const needsProt = r.guardrails.some((g) => (g.id === 'G3' || g.id === 'G6' || g.id === 'G7') && g.level === 'warn');
  const tokens = r.steps.reduce((x, s) => x + (s.tokens || 0), 0);
  const prop = r.proposal;

  return (
    <div className="stack gap-lg">
      <div className="row gap-sm wrap">
        <Badge tone={STATUS_TONE[r.status]}>{r.status.replace('-', ' ')}</Badge>
        <span className="h4">{a.name}</span>
        <span className="body-sm t-tertiary">· {r.goal}</span>
        <span className="grow" />
        <Badge>{r.mode === 'live' ? `live · ${settings.model}` : 'demo mode'}</Badge>
        {tokens > 0 && <span className="mono-sm t-tertiary">{tokens.toLocaleString()} tokens</span>}
        <span className="mono-sm t-tertiary">{ago(r.startedAt)}</span>
        {r.prUrl && <a className="btn ghost sm" href={r.prUrl} target="_blank" rel="noreferrer">PR #{r.prNumber} ↗</a>}
        {!r.prUrl && r.prNumber && <Badge tone="brand">PR #{r.prNumber}</Badge>}
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) minmax(0, 1.3fr)', alignItems: 'start' }}>
        <section className="card stack gap-sm">
          <div className="overline t-tertiary">Trace · harness → RAG → tools → guardrails & evals</div>
          <div className="timeline">
            {r.steps.map((s, i) => {
              const [ic, cls] = ICON[s.kind];
              const c = s.ok === false ? 'bad' : s.ok === true && s.kind !== 'tool_result' ? 'ok' : cls;
              return (
                <div key={i} className="ev">
                  <span className={`ico ${c}`}>{ic}</span>
                  {s.detail ? <details><summary className="body-sm"><span style={{ fontWeight: 500 }}>{s.title}</span>{s.tokens ? <span className="mono-sm t-tertiary"> · {s.tokens} tok</span> : null}</summary><pre>{s.detail}</pre></details>
                    : <span className="body-sm" style={{ fontWeight: 500 }}>{s.title}</span>}
                </div>
              );
            })}
            {r.status === 'running' && <div className="ev"><span className="ico model">…</span><span className="body-sm t-tertiary">working…</span></div>}
          </div>
        </section>

        <div className="stack gap-md">
          {r.output && <div className="panel body-sm">{r.output}</div>}

          {(r.guardrails.length > 0 || r.evals.length > 0) && (
            <section className="card stack gap-sm">
              <div className="row between"><span className="overline t-tertiary">Guardrails & evaluation</span>{r.evals.length > 0 && <span className="score t-brand">{pct(r.evals)}%</span>}</div>
              {r.guardrails.map((g) => <div key={g.id} className="row gap-sm start body-sm"><Badge tone={g.level === 'pass' ? 'success' : g.level === 'warn' ? 'warning' : 'danger'}>{g.level}</Badge><span><strong>{g.name}</strong> — <span className="t-secondary">{g.message}</span></span></div>)}
              {r.evals.map((e) => <div key={e.id} className="row gap-sm body-sm"><span className="score" style={{ minWidth: 44, color: e.score / e.max >= 0.8 ? 'var(--color-text-success)' : e.score / e.max >= 0.5 ? 'var(--color-text-warning)' : 'var(--color-text-danger)' }}>{e.score}/{e.max}</span><span>{e.name}</span><span className="t-tertiary">{e.note}</span></div>)}
            </section>
          )}

          {prop?.idea && <section className="card"><Markdown text={`**Intent:** ${prop.idea.intent}\n\n**Problem:** ${prop.idea.problem}\n\n**Users:** ${(prop.idea.users || []).join(', ')}\n\n**Outcome metric:** ${prop.idea.outcomeMetric}\n\n**In scope:**\n${(prop.idea.scopeIn || []).map((x) => `- ${x}`).join('\n')}\n\n**Out of scope:** ${(prop.idea.scopeOut || []).join(', ')}\n\n**Risks:** ${(prop.idea.risks || []).join(', ')}`} /></section>}
          {prop?.requirements && <section className="card stack gap-sm">{prop.requirements.map((q) => <div key={q.id} className="stack gap-xs"><div className="row gap-sm"><span className="mono t-brand">{q.id}</span><strong>{q.title}</strong><Badge>{q.priority}</Badge></div><div className="body-sm t-secondary">{q.story}</div><div className="mono-sm t-tertiary" style={{ whiteSpace: 'pre-line' }}>{q.ac.join('\n—\n')}</div></div>)}</section>}
          {prop?.tests && <section className="card stack gap-sm">{prop.tests.map((t) => <div key={t.id} className="stack gap-xs"><div className="row gap-sm"><span className="mono t-brand">{t.id}</span><strong>{t.title}</strong><Badge tone="info">{t.reqIds.join(', ')}</Badge><Badge>{t.type}</Badge></div><div className="mono-sm t-tertiary" style={{ whiteSpace: 'pre-line' }}>{t.gherkin}</div></div>)}</section>}

          {r.changes.length > 0 && (
            <section className="card stack gap-sm">
              <div className="overline t-tertiary">Change set · {r.changes.length} file(s){r.branch ? ` · branch ${r.branch}` : ''}</div>
              {r.changes.map((c) => (
                <div key={c.path} className="stack gap-xs">
                  <button className="option" style={{ padding: 8 }} onClick={() => setOpen(open === c.path ? null : c.path)} aria-expanded={open === c.path}>
                    <Badge tone={c.action === 'create' ? 'success' : c.action === 'delete' ? 'danger' : 'info'}>{c.action}</Badge>
                    <span className="mono" style={{ fontSize: 12 }}>{c.path}</span>
                    <span className="body-sm t-tertiary grow" style={{ textAlign: 'right' }}>{c.reason}</span>
                  </button>
                  {open === c.path && <Diff before={c.before} after={c.action === 'delete' ? '' : c.content} />}
                </div>
              ))}
            </section>
          )}

          {r.status === 'awaiting-approval' && (
            <section className="card stack gap-md" style={{ borderColor: 'var(--color-bg-accent)', background: 'var(--color-bg-accent-subtle)' }}>
              <div className="h4">Human approval — {a.gate}</div>
              {isBlocked && <div className="body-sm t-danger">Blocked by a guardrail. Fix the issue (ask the agent again with a narrower goal) before this can be approved.</div>}
              {needsProt && !isBlocked && <label className="row gap-sm body-sm"><input type="checkbox" checked={protOk} onChange={(e) => setProtOk(e.target.checked)} /> I reviewed the protected-path / deletion / dependency warnings above.</label>}
              <div className="body-sm t-secondary">
                {prop ? 'Approving merges this proposal into the project spec (compass/spec.json). Commit the spec to GitHub afterwards.'
                  : p.repo && settings.githubToken && !p.demo ? `Approving commits ${r.changes.length} file(s) to a new branch and opens a pull request on ${p.repo.owner}/${p.repo.name}. CI runs automatically.`
                  : 'Approving marks this change ready. Connect a GitHub repo to open a real pull request.'}
              </div>
              <div className="row gap-sm">
                <Button variant="accent" disabled={busy || isBlocked || (needsProt && !protOk)} onClick={() => run(() => approveRun(p.id, r.id))}>{busy ? 'Working…' : r.changes.length && p.repo && !p.demo ? 'Approve & open PR' : 'Approve'}</Button>
                <Button variant="secondary" disabled={busy} onClick={() => { const why = prompt('Why reject? (recorded in the trace)') || 'No reason given'; rejectRun(p.id, r.id, why); }}>Reject</Button>
              </div>
            </section>
          )}
          {r.status === 'approved' && r.agent === 'coder' && <div className="panel body-sm">Approved{r.prNumber ? ` — PR #${r.prNumber}` : ''}. Ship it from the <strong>Release</strong> stage once CI is green.</div>}
        </div>
      </div>
      {!compact && <div><Button variant="ghost" size="sm" onClick={() => store.update(p.id, (x) => ({ ...x, runs: x.runs.filter((y) => y.id !== r.id) }))}>Delete this run</Button></div>}
    </div>
  );
}
