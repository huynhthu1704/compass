import { useEffect, useRef, useState } from 'react';
import { ideaLabel, makeQuote, reqText, screenText, selectionSource, testText, versionItems, type SelectionEnd } from '../conversation';
import { agent, approveRun, rejectRun } from '../harness';
import { blocked, pct } from '../guardrails';
import { store, useStore } from '../store';
import type { Project, Quote, Run, StepKind } from '../types';
import { ago, Badge, Button, Diff, useAction } from '../ui';
import { CompareView, ConversationThread, QuotePill, ReplyBox, VersionPicker } from './RunConversation';

const ICON: Record<StepKind, [string, string]> = { plan: ['◎', ''], retrieve: ['R', 'tool'], tool_call: ['ƒ', 'tool'], tool_result: ['↩', 'tool'], model: ['✦', 'model'], guardrail: ['G', ''], eval: ['E', 'model'], approval: ['✋', 'wait'], github: ['⎇', 'ok'], error: ['!', 'bad'] };
export const STATUS_TONE = { running: 'info', 'awaiting-approval': 'accent', approved: 'success', rejected: 'neutral', failed: 'danger', done: 'success' } as const;
const IDEA_ROWS = ['intent', 'problem', 'users', 'outcomeMetric', 'scopeIn', 'scopeOut', 'risks'] as const;

export function RunView({ p, r, compact }: { p: Project; r: Run; compact?: boolean }) {
  const a = agent(r.agent);
  const { busy, run } = useAction();
  const { settings } = useStore();
  const [open, setOpen] = useState<string | null>(r.changes[0]?.path || null);
  const [protOk, setProtOk] = useState(false);
  // F-020: quotes waiting in the reply box, the version being read (null = latest) and the compare view
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [view, setView] = useState<number | null>(null);
  const [compareN, setCompareN] = useState<number | null>(null);
  const [pop, setPop] = useState<{ x: number; y: number; source: string; text: string } | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isBlocked = blocked(r.guardrails);
  const needsProt = r.guardrails.some((g) => (g.id === 'G3' || g.id === 'G6' || g.id === 'G7') && g.level === 'warn');
  const tokens = r.steps.reduce((x, s) => x + (s.tokens || 0), 0);
  const vs = r.versions || [];
  const latestN = vs.length ? vs[vs.length - 1].n : 1;
  const shown = view != null ? vs.find((v) => v.n === view) : undefined;
  const prop = shown ? shown.proposal : r.proposal;
  const changes = shown ? shown.changes : r.changes;
  const output = shown ? shown.output : r.output;
  const quotable = r.status !== 'running';
  const canReply = r.status !== 'running' && !!(r.output || r.proposal || r.changes.length || r.conversation?.length);

  const addQuote = (source: string, text: string) => {
    const q = makeQuote(source, text);
    if (!q) return;
    setQuotes((qs) => [...qs, q]);
    if (inputRef.current) inputRef.current.focus(); else setTimeout(() => inputRef.current?.focus(), 0);
  };

  // A selection fully inside the answer of a finished run shows the floating Quote button (REQ-050)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const sel = window.getSelection();
      const root = answerRef.current;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !root) { setPop(null); return; }
      const end = (n: Node | null): SelectionEnd => {
        if (!n) return { inAnswer: false };
        const el = n.nodeType === 1 ? (n as Element) : n.parentElement;
        return { inAnswer: root.contains(n), source: el?.closest('[data-quote-source]')?.getAttribute('data-quote-source') ?? null };
      };
      const source = selectionSource(end(sel.anchorNode), end(sel.focusNode), r.status, r.replying);
      const text = sel.toString();
      if (!source || !text.trim()) { setPop(null); return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) { setPop(null); return; } // selection scrolled out of view
      setPop({ x: Math.min(Math.max(rect.left, 8), window.innerWidth - 112), y: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 52)), source, text });
    };
    const later = () => { clearTimeout(t); t = setTimeout(check, 120); };
    document.addEventListener('selectionchange', later);
    window.addEventListener('scroll', later, true);
    window.addEventListener('resize', later);
    return () => { clearTimeout(t); document.removeEventListener('selectionchange', later); window.removeEventListener('scroll', later, true); window.removeEventListener('resize', later); };
  }, [r.status, r.replying]);

  const pill = (label: string, source: string, text: string) => (quotable ? <QuotePill label={label} onQuote={() => addQuote(source, text)} /> : null);
  const ideaText = prop?.idea ? versionItems({ proposal: { idea: prop.idea }, changes: [] }).map((x) => `${x.key.replace('Idea · ', '')}: ${x.text}`).join('\n') : '';
  const cmp = compareN && vs.length > 1 ? { prev: vs.find((v) => v.n === compareN - 1), next: vs.find((v) => v.n === compareN) } : null;

  return (
    <div className="stack gap-lg">
      <div className="row gap-sm wrap">
        <Badge tone={STATUS_TONE[r.status]}>{r.status.replace('-', ' ')}</Badge>
        <span className="h4">{a.name}</span>
        <span className="body-sm t-tertiary">· {r.goal}</span>
        <span className="grow" />
        <VersionPicker r={r} view={view} setView={(n) => { setView(n); setCompareN(null); }} />
        {vs.length > 1 && <Button variant="ghost" size="sm" onClick={() => setCompareN(compareN ? null : view ?? latestN)} disabled={(view ?? latestN) === 1}>{compareN ? 'Hide changes' : 'Compare with previous version'}</Button>}
        <Badge>{r.mode === 'live' ? `live · ${settings.model}` : 'demo mode'}</Badge>
        {tokens > 0 && <span className="mono-sm t-tertiary">{tokens.toLocaleString()} tokens</span>}
        <span className="mono-sm t-tertiary">{ago(r.startedAt)}</span>
        {r.prUrl && <a className="btn ghost sm" href={r.prUrl} target="_blank" rel="noreferrer">PR #{r.prNumber} ↗</a>}
        {!r.prUrl && r.prNumber && <Badge tone="brand">PR #{r.prNumber}</Badge>}
      </div>

      <div className={`grid-2 run-grid${compact ? ' compact' : ''}`}>
        <div className="stack gap-md">
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
          <ConversationThread r={r} onCompare={(n) => { setView(null); setCompareN(n); }} />
        </div>

        <div className="stack gap-md">
          {shown && <div className="panel body-sm row gap-sm wrap"><span className="grow">You are reading <strong>v{shown.n}</strong> — v{latestN} is the latest and is what Approve applies.</span><Button variant="ghost" size="sm" onClick={() => setView(null)}>Show latest</Button></div>}
          {cmp?.prev && cmp.next && <CompareView prev={cmp.prev} next={cmp.next} onClose={() => setCompareN(null)} />}

          <div ref={answerRef} className="stack gap-md" data-quote-root>
            {output && <div className="panel body-sm" data-quote-source="Summary">{output}</div>}

            {(r.guardrails.length > 0 || r.evals.length > 0) && !shown && (
              <section className="card stack gap-sm">
                <div className="row between"><span className="overline t-tertiary">Guardrails & evaluation</span>{r.evals.length > 0 && <span className="score t-brand">{pct(r.evals)}%</span>}</div>
                {r.guardrails.map((g) => <div key={g.id} className="row gap-sm start body-sm"><Badge tone={g.level === 'pass' ? 'success' : g.level === 'warn' ? 'warning' : 'danger'}>{g.level}</Badge><span><strong>{g.name}</strong> — <span className="t-secondary">{g.message}</span></span></div>)}
                {r.evals.map((e) => <div key={e.id} className="row gap-sm wrap body-sm"><span className="score" style={{ minWidth: 44, color: e.score / e.max >= 0.8 ? 'var(--color-text-success)' : e.score / e.max >= 0.5 ? 'var(--color-text-warning)' : 'var(--color-text-danger)' }}>{e.score}/{e.max}</span><span>{e.name}</span><span className="t-tertiary">{e.note}</span></div>)}
              </section>
            )}

            {prop?.idea && (
              <section className="card stack gap-sm">
                <div className="row gap-sm"><span className="overline t-tertiary grow">Idea brief</span>{pill('the idea brief', 'Idea · whole brief', ideaText)}</div>
                {IDEA_ROWS.filter((k) => prop.idea![k] !== undefined).map((k) => {
                  const v = prop.idea![k];
                  return <div key={k} className="body-sm" data-quote-source={`Idea · ${ideaLabel(k)}`}><strong>{ideaLabel(k)[0].toUpperCase() + ideaLabel(k).slice(1)}:</strong> {Array.isArray(v) ? (v.length > 1 && (k === 'scopeIn' || k === 'risks') ? <ul className="idea-list">{v.map((x, i) => <li key={i}>{x}</li>)}</ul> : v.join(', ')) : v}</div>;
                })}
              </section>
            )}
            {prop?.requirements && <section className="card stack gap-md">{prop.requirements.map((q) => (
              <div key={q.id} className="stack gap-xs" data-quote-source={q.id}>
                <div className="row gap-sm wrap"><span className="mono t-brand">{q.id}</span><strong>{q.title}</strong><Badge>{q.priority}</Badge><span className="grow" />{pill(q.id, `${q.id} · whole requirement`, reqText(q))}</div>
                <div className="body-sm t-secondary" data-quote-source={`${q.id} · story`}>{q.story}</div>
                {q.ac.map((ac, i) => <div key={i} className="mono-sm t-tertiary ac-line" data-quote-source={`${q.id} · AC ${i + 1}`}>{ac}</div>)}
              </div>
            ))}</section>}
            {prop?.design && <section className="card stack gap-md">
              <div className="body-sm" data-quote-source="Design · summary">{prop.design.summary}</div>
              {prop.design.screens.map((s) => (
                <div key={s.id} className="stack gap-xs" data-quote-source={s.id}>
                  <div className="row gap-sm wrap"><span className="mono t-brand">{s.id}</span><strong>{s.name}</strong><Badge tone="info">{s.reqIds.join(', ')}</Badge><span className="grow" />{pill(s.id, `${s.id} · whole screen`, screenText(s))}</div>
                  <div className="body-sm t-secondary" data-quote-source={`${s.id} · purpose`}>{s.purpose}</div>
                  <div className="mono-sm t-tertiary" data-quote-source={`${s.id} · elements`}>Elements: {s.elements.join(' · ')}</div>
                  <div className="mono-sm t-tertiary" data-quote-source={`${s.id} · states`}>States: {s.states.join(' · ')}</div>
                </div>
              ))}
              {prop.design.notes && <div className="body-sm t-tertiary" data-quote-source="Design · notes">{prop.design.notes}</div>}
            </section>}
            {prop?.tests && <section className="card stack gap-md">{prop.tests.map((t) => (
              <div key={t.id} className="stack gap-xs" data-quote-source={t.id}>
                <div className="row gap-sm wrap"><span className="mono t-brand">{t.id}</span><strong>{t.title}</strong><Badge tone="info">{t.reqIds.join(', ')}</Badge><Badge>{t.type}</Badge><span className="grow" />{pill(t.id, `${t.id} · whole test`, testText(t))}</div>
                <div className="mono-sm t-tertiary" style={{ whiteSpace: 'pre-line' }} data-quote-source={`${t.id} · gherkin`}>{t.gherkin}</div>
              </div>
            ))}</section>}

            {changes.length > 0 && (
              <section className="card stack gap-sm">
                <div className="overline t-tertiary">Change set · {changes.length} file(s){r.branch ? ` · branch ${r.branch}` : ''}</div>
                {changes.map((c) => (
                  <div key={c.path} className="stack gap-xs" data-quote-source={c.path}>
                    <div className="row gap-sm">
                      <button className="option grow" style={{ padding: 8 }} onClick={() => setOpen(open === c.path ? null : c.path)} aria-expanded={open === c.path}>
                        <Badge tone={c.action === 'create' ? 'success' : c.action === 'delete' ? 'danger' : 'info'}>{c.action}</Badge>
                        <span className="mono" style={{ fontSize: 12 }}>{c.path}</span>
                        <span className="body-sm t-tertiary grow" style={{ textAlign: 'right' }}>{c.reason}</span>
                      </button>
                      {c.action !== 'delete' && pill(c.path, c.path, c.content)}
                    </div>
                    {open === c.path && <Diff before={c.before} after={c.action === 'delete' ? '' : c.content} />}
                  </div>
                ))}
              </section>
            )}
          </div>

          {canReply && <ReplyBox p={p} r={r} quotes={quotes} setQuotes={setQuotes} inputRef={inputRef} />}

          {r.status === 'awaiting-approval' && (
            <section className="card stack gap-md" style={{ borderColor: 'var(--color-bg-accent)', background: 'var(--color-bg-accent-subtle)' }}>
              <div className="h4">Human approval — {a.gate}</div>
              {isBlocked && <div className="body-sm t-danger">Blocked by a guardrail. Fix the issue (quote it and Revise, or ask the agent again with a narrower goal) before this can be approved.</div>}
              {needsProt && !isBlocked && <label className="row gap-sm body-sm"><input type="checkbox" checked={protOk} onChange={(e) => setProtOk(e.target.checked)} /> I reviewed the protected-path / deletion / dependency warnings above.</label>}
              <div className="body-sm t-secondary">
                {vs.length > 1 ? `Approving applies Proposal v${latestN} (latest). Earlier versions stay readable in this run. ` : ''}
                {r.proposal ? 'Approving merges this proposal into the project spec (compass/spec.json). Commit the spec to GitHub afterwards.'
                  : p.repo && settings.githubToken && !p.demo ? `Approving commits ${r.changes.length} file(s) to a new branch and opens a pull request on ${p.repo.owner}/${p.repo.name}. CI runs automatically.`
                  : 'Approving marks this change ready. Connect a GitHub repo to open a real pull request.'}
              </div>
              <div className="row gap-sm">
                <Button variant="accent" disabled={busy || isBlocked || (needsProt && !protOk) || !!r.replying} onClick={() => run(() => approveRun(p.id, r.id))}>{busy ? 'Working…' : `${r.changes.length && p.repo && !p.demo ? 'Approve & open PR' : 'Approve'}${vs.length > 1 ? ` v${latestN}` : ''}`}</Button>
                <Button variant="secondary" disabled={busy || !!r.replying} onClick={() => { const why = prompt('Why reject? (recorded in the trace)') || 'No reason given'; rejectRun(p.id, r.id, why); }}>Reject</Button>
              </div>
            </section>
          )}
          {r.status === 'approved' && r.agent === 'coder' && <div className="panel body-sm">Approved{r.prNumber ? ` — PR #${r.prNumber}` : ''}. Ship it from the <strong>Release</strong> stage once CI is green.</div>}
        </div>
      </div>
      {pop && <button type="button" className="quote-pop" style={{ left: pop.x, top: pop.y }} onMouseDown={(e) => e.preventDefault()} onClick={() => { addQuote(pop.source, pop.text); window.getSelection()?.removeAllRanges(); setPop(null); }}>❝ Quote</button>}
      {!compact && <div><Button variant="ghost" size="sm" onClick={() => store.update(p.id, (x) => ({ ...x, runs: x.runs.filter((y) => y.id !== r.id) }))}>Delete this run</Button></div>}
    </div>
  );
}
