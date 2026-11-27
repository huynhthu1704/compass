/**
 * F-020 — quote an agent answer and ask for details or a revision (REQ-050 … REQ-054).
 * Quote blocks, the reply box (Revise → vN / Ask), the conversation thread, the version picker and the compare view.
 * Design: compass/design/F-020.md (Figma SCR-1 … SCR-4).
 */
import { useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { canAsk, canRevise, canSend, revisableQuotes, versionItems } from '../conversation';
import { replyingNow, replyToRun } from '../followUp';
import type { Project, Quote, Run, RunVersion } from '../types';
import { ago, Badge, Button, Diff, useAction } from '../ui';

export function QuoteBlock({ q, onRemove }: { q: Quote; onRemove?: () => void }) {
  return (
    <div className="quote-block">
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="quote-src">{q.source}</div>
        <div className="quote-text">{q.text}</div>
      </div>
      {onRemove && <button type="button" className="quote-x" onClick={onRemove} aria-label={`Remove quote ${q.source}`}>×</button>}
    </div>
  );
}

/** "❝ Quote" pill that quotes a whole item (REQ-050 AC 3); a real button, so Tab + Enter work. */
export const QuotePill = ({ label, onQuote }: { label: string; onQuote: () => void }) => (
  <button type="button" className="quote-pill" onClick={onQuote} aria-label={`Quote ${label}`}>❝ Quote</button>
);

/** Reply to the agent (SCR-1, SCR-3, SCR-4 B/D/E). */
export function ReplyBox({ p, r, quotes, setQuotes, inputRef }: { p: Project; r: Run; quotes: Quote[]; setQuotes: Dispatch<SetStateAction<Quote[]>>; inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const [message, setMessage] = useState('');
  const { busy, run } = useAction();
  const reply = { quotes, message };
  const replying = replyingNow(r);
  const working = busy || !!replying;
  const rev = canRevise({ ...r, replying });
  const nextV = (r.versions?.length || 1) + 1;
  const send = (kind: 'ask' | 'revise') => run(async () => {
    const sent = quotes;
    const msg = await replyToRun(p.id, r.id, kind, sent, message);
    setQuotes((now) => now.filter((q) => !sent.includes(q))); // keep quotes added while the agent worked
    setMessage('');
    return msg;
  });
  const reviseOff = working || !rev.ok || !revisableQuotes(quotes);
  const askOff = working || !canAsk({ ...r, replying }) || !canSend(reply);
  const hint = working ? `${replying === 'revise' ? 'The agent is revising' : 'The agent is answering'} — Ask and Revise are disabled until it finishes.`
    : !rev.ok ? rev.why
    : !canSend(reply) ? 'Quote something or type a message.'
    : !quotes.length ? 'Ask: the agent answers, the proposal stays. Quote what should change to Revise.'
    : !revisableQuotes(quotes) ? 'These quotes span several items or the summary — Ask about them, or quote inside one item to Revise it.'
    : 'Ask: the agent answers, the proposal stays. Revise: a new version changes only what you quoted.';
  return (
    <section className={`card stack gap-sm reply-box${quotes.length ? ' has-quotes' : ''}`} aria-label="Reply to the agent">
      <div className="row between"><span className="overline t-tertiary">Reply to the agent</span>{quotes.length > 0 && <span className="body-sm t-tertiary">{quotes.length} quote{quotes.length > 1 ? 's' : ''}</span>}</div>
      {quotes.map((q, i) => <QuoteBlock key={`${q.source}-${i}`} q={q} onRemove={() => setQuotes((qs) => qs.filter((_, k) => k !== i))} />)}
      <textarea ref={inputRef} className="textarea" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Select text in the answer and press Quote, or type a question…" aria-label="Message to the agent"
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !askOff) { e.preventDefault(); send('ask'); } }} />
      <div className="row gap-sm wrap reply-actions">
        <Button variant="primary" disabled={reviseOff} onClick={() => send('revise')} title={!rev.ok ? rev.why : undefined}>{replying === 'revise' ? 'Revising…' : `Revise → v${nextV}`}</Button>
        <Button variant="secondary" disabled={askOff} onClick={() => send('ask')}>{replying === 'ask' ? 'Asking…' : 'Ask'}</Button>
        <span className="body-sm t-tertiary grow">{hint}</span>
      </div>
      {r.mode === 'demo' && <div className="body-sm t-tertiary">Demo mode: the agent answers at once with a fixed text that repeats the quoted sources.</div>}
    </section>
  );
}

/** The run's conversation (SCR-2): your messages with quotes, answers with tokens, version markers. */
export function ConversationThread({ r, onCompare }: { r: Run; onCompare: (n: number) => void }) {
  const replying = replyingNow(r);
  if (!r.conversation?.length && !replying) return null;
  return (
    <section className="card stack gap-sm" aria-label="Conversation">
      <div className="overline t-tertiary">Conversation</div>
      {(r.conversation || []).map((t) => t.who === 'you' ? (
        <div key={t.id} className="turn you stack gap-xs">
          <div className="row gap-sm"><strong className="body-sm">You</strong><Badge tone={t.kind === 'revise' ? 'brand' : 'neutral'}>{t.kind === 'revise' ? 'Revise' : 'Ask'}</Badge><span className="grow" /><span className="mono-sm t-tertiary">{ago(t.at)}</span></div>
          {t.quotes?.map((q, i) => <QuoteBlock key={i} q={q} />)}
          {t.text && <div className="body-sm" style={{ whiteSpace: 'pre-wrap' }}>{t.text}</div>}
        </div>
      ) : (
        <div key={t.id} className="stack gap-xs">
          <div className="turn agent stack gap-xs">
            <div className="row gap-sm"><strong className="body-sm">Agent</strong><span className="grow" /><span className="mono-sm t-tertiary">{t.tokens ? `${t.tokens.toLocaleString()} tok · ` : ''}{ago(t.at)}</span></div>
            <div className="body-sm t-secondary" style={{ whiteSpace: 'pre-wrap' }}>{t.text}</div>
          </div>
          {t.version && t.summary && (
            <div className="version-marker row gap-sm">
              <span className="body-sm grow" style={{ fontWeight: 600 }}>{t.summary}</span>
              {t.version > 1 && <button type="button" className="btn ghost sm" onClick={() => onCompare(t.version!)}>Compare</button>}
            </div>
          )}
        </div>
      ))}
      {replying && <div className="body-sm t-tertiary">… the agent is {replying === 'revise' ? 'revising' : 'answering'}</div>}
    </section>
  );
}

/** v1 / v2 · latest (SCR-2 header). `view` null = latest. */
export function VersionPicker({ r, view, setView }: { r: Run; view: number | null; setView: (n: number | null) => void }) {
  const vs = r.versions || [];
  if (vs.length < 2) return null;
  const latest = vs[vs.length - 1].n;
  return (
    <div className="version-picker" role="group" aria-label="Proposal version">
      {vs.map((v) => <button key={v.n} type="button" aria-pressed={(view ?? latest) === v.n} onClick={() => setView(v.n === latest ? null : v.n)}>{v.n === latest ? `v${v.n} · latest` : `v${v.n}`}</button>)}
    </div>
  );
}

/** Changed items as a diff with the previous version; unchanged items folded (REQ-053). */
export function CompareView({ prev, next, onClose }: { prev: RunVersion; next: RunVersion; onClose: () => void }) {
  const before = new Map(versionItems(prev).map((x) => [x.key, x.text]));
  const items = versionItems(next);
  const changed = items.filter((x) => before.get(x.key) !== x.text);
  const same = items.filter((x) => before.get(x.key) === x.text);
  return (
    <section className="card stack gap-md" aria-label={`Compare v${next.n} with v${prev.n}`}>
      <div className="row gap-sm wrap"><span className="h4">Proposal v{next.n}</span><Badge tone="info">changes from v{prev.n}</Badge><span className="grow" /><Button variant="ghost" size="sm" onClick={onClose}>Hide changes</Button></div>
      {changed.length === 0 && <div className="body-sm t-tertiary">No changes from v{prev.n}.</div>}
      {changed.map((x) => (
        <div key={x.key} className="stack gap-xs">
          <div className="row gap-sm"><span className="mono t-brand">{x.key}</span><Badge tone={before.has(x.key) ? 'accent' : 'success'}>{before.has(x.key) ? 'changed' : 'new'}</Badge></div>
          <Diff before={before.get(x.key) || ''} after={x.text} />
        </div>
      ))}
      {same.length > 0 && (
        <details className="panel body-sm">
          <summary>{same.length} unchanged item{same.length > 1 ? 's' : ''} · same as v{prev.n}</summary>
          <div className="t-tertiary" style={{ marginTop: 6 }}>{same.map((x) => x.key).join(' · ')}</div>
        </details>
      )}
    </section>
  );
}
