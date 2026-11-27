/**
 * F-020 — quote an agent answer and ask for details or a revision (REQ-050 … REQ-054).
 * Quote blocks, one reply card per quote (Revise → vN / Ask / Cancel), the Ask box, the conversation thread, the version picker and the compare view.
 * Design: compass/design/F-020.md (Figma SCR-1 … SCR-4).
 */
import { useState } from 'react';
import { canAsk, canRevise, canSend, revisableQuotes, versionItems } from '../conversation';
import { replyingNow, replyToRun } from '../followUp';
import type { Project, Quote, Run, RunVersion } from '../types';
import { ago, Badge, Button, Diff, useAction } from '../ui';

export function QuoteBlock({ q }: { q: Quote }) {
  return (
    <div className="quote-block">
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="quote-src">{q.source}</div>
        <div className="quote-text">{q.text}</div>
      </div>
    </div>
  );
}

/** "❝ Quote" pill that quotes a whole item (REQ-050 AC 3); a real button, so Tab + Enter work. */
export const QuotePill = ({ label, onQuote }: { label: string; onQuote: () => void }) => (
  <button type="button" className="quote-pill" onClick={onQuote} aria-label={`Quote ${label}`}>❝ Quote</button>
);

/** An open reply card: one quote, its own message, Revise / Ask / Cancel (REQ-050, REQ-051; SCR-1, SCR-3). */
export interface Card { id: string; quote: Quote }

/** Status line shared by the cards and the Ask box while the agent works (SCR-4 E). */
const workingHint = (replying: Run['replying']) => `${replying === 'revise' ? 'The agent is revising' : 'The agent is answering'} — wait until it finishes.`;

/**
 * One reply per quote: its own message, Revise → vN, Ask and Cancel. Esc in the card closes it like Cancel. A sent card
 * closes; a failed one stays open with its message, so nothing typed is lost.
 */
export function ReplyCard({ p, r, card, onClose }: { p: Project; r: Run; card: Card; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const { busy, run } = useAction();
  const replying = replyingNow(r);
  const working = busy || !!replying;
  const rev = canRevise({ ...r, replying });
  const nextV = (r.versions?.length || 1) + 1;
  const quotes = [card.quote];
  const send = (kind: 'ask' | 'revise') => run(async () => { const msg = await replyToRun(p.id, r.id, kind, quotes, message); onClose(); return msg; });
  const reviseOff = working || !rev.ok || !revisableQuotes(quotes);
  const askOff = working || !canAsk({ ...r, replying });
  const hint = working ? workingHint(replying)
    : !rev.ok ? `Ask still works. ${rev.why}.`
    : !revisableQuotes(quotes) ? 'This quote spans several items or the summary — Ask about it, or quote inside one item to Revise it.'
    : null;
  return (
    <section className="card stack gap-sm reply-card" data-card-id={card.id} aria-label={`Reply to the quote ${card.quote.source}`}
      onKeyDown={(e) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); onClose(); } }}>
      <span className="overline t-tertiary">Reply to this quote</span>
      <QuoteBlock q={card.quote} />
      <textarea autoFocus className="textarea" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask or ask for a change about this quote… (Esc cancels)" aria-label={`Message about ${card.quote.source}`}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !askOff) { e.preventDefault(); send('ask'); } }} />
      <div className="row gap-sm wrap reply-actions">
        <Button variant="primary" disabled={reviseOff} onClick={() => send('revise')} title={!rev.ok ? rev.why : undefined}>{busy && replying === 'revise' ? 'Revising…' : `Revise → v${nextV}`}</Button>
        <Button variant="secondary" disabled={askOff} onClick={() => send('ask')}>{busy && replying === 'ask' ? 'Asking…' : 'Ask'}</Button>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
        {hint && <span className="body-sm t-tertiary grow">{hint}</span>}
      </div>
    </section>
  );
}

/** A question without a quote (REQ-051 AC 1, AC 5). Esc clears it. */
export function AskBox({ p, r }: { p: Project; r: Run }) {
  const [message, setMessage] = useState('');
  const { busy, run } = useAction();
  const replying = replyingNow(r);
  const askOff = busy || !!replying || !canAsk({ ...r, replying }) || !canSend({ quotes: [], message });
  const send = () => run(async () => { const msg = await replyToRun(p.id, r.id, 'ask', [], message); setMessage(''); return msg; });
  return (
    <section className="card stack gap-sm ask-box" aria-label="Ask the agent">
      <div className="row gap-sm">
        <textarea className="textarea grow" rows={1} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask without a quote…" aria-label="Question to the agent"
          onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setMessage(''); } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !askOff) { e.preventDefault(); send(); } }} />
        <Button variant="secondary" disabled={askOff} onClick={send}>{busy ? 'Asking…' : 'Ask'}</Button>
      </div>
      <div className="body-sm t-tertiary">{replying ? workingHint(replying) : 'Select text in the answer or press an item\'s Quote button to open a reply card for it. Each card is sent on its own; Cancel or Esc closes only that card.'}{r.mode === 'demo' ? ' Demo mode: the agent answers at once with a fixed text.' : ''}</div>
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
