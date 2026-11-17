import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { PHASE_INFO, type ActionDef } from './catalog';
import type { Phase, Story } from './types';

type BtnStyle = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'primary', size, children, ...rest }: { variant?: BtnStyle; size?: 'sm' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn ${variant} ${size || ''}`} {...rest}>{children}</button>;
}

export type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => <span className={`badge tone-${tone}`}>{children}</span>;

export function PhaseChip({ phase, active, done, onClick }: { phase: Phase; active?: boolean; done?: boolean; onClick?: () => void }) {
  const cls = `chip phase-${phase} ${active ? 'active' : ''} ${done ? 'done' : ''}`;
  const inner = <>{done ? <span aria-hidden>✓</span> : <span className="dot" />}{PHASE_INFO[phase].name}</>;
  return onClick ? <button className={cls} onClick={onClick}>{inner}</button> : <span className={cls}>{inner}</span>;
}

export function ActionCard({ action, reason, recommended, selected, done, urgent, blockedBy, onClick }: { action: ActionDef; reason?: string; recommended?: boolean; selected?: boolean; done?: boolean; urgent?: boolean; blockedBy?: string[]; onClick?: () => void }) {
  return (
    <button className={`action-card ${recommended ? 'recommended' : ''} ${selected ? 'selected' : ''} ${done ? 'done' : ''}`} onClick={onClick} aria-pressed={selected}>
      <div className="row gap-sm wrap">
        <PhaseChip phase={action.phase} />
        {recommended && <Badge tone="accent">★ Recommended</Badge>}
        {urgent && !recommended && <Badge tone="danger">Needs attention</Badge>}
        {done && <Badge tone="success">Done</Badge>}
        {action.heavy && <Badge>Heavy</Badge>}
      </div>
      <div className="h4">{action.title}</div>
      <div className="body-sm t-secondary">{reason || action.why}</div>
      {blockedBy && blockedBy.length > 0 && <div className="body-sm t-accent">Best after: {blockedBy.join(', ')}</div>}
      <div className="mono-sm t-tertiary">{action.babok} · {action.effort}</div>
    </button>
  );
}

const PRI_TONE: Record<string, Tone> = { Must: 'danger', Should: 'warning', Could: 'info', "Won't": 'neutral' };
const STATUS_TONE: Record<string, Tone> = { 'To do': 'neutral', 'In progress': 'warning', Done: 'success' };

export function StoryCard({ s, onClick }: { s: Story; onClick?: () => void }) {
  return (
    <div className="card elev stack gap-md" onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <div className="row gap-sm">
        <span className="mono t-brand">{s.key}</span>
        <PhaseChip phase="build" />
        <span className="grow" />
        <span className="label-sm t-tertiary">{s.points} pts</span>
      </div>
      <div style={{ fontWeight: 500 }}>As a {s.asA}, I want {s.iWant}, so that {s.soThat}.</div>
      <div className="panel stack gap-xs">
        <div className="overline t-tertiary">Acceptance criteria</div>
        {s.ac.slice(0, 2).map((a, i) => <div key={i} className="body-sm t-secondary">• {a.replace(/\n/g, ' ')}</div>)}
        {s.ac.length > 2 && <div className="body-sm t-tertiary">+{s.ac.length - 2} more</div>}
      </div>
      <div className="row gap-xs wrap">
        <Badge tone="brand">{s.epic}</Badge>
        <Badge tone={PRI_TONE[s.priority]}>{s.priority}</Badge>
        <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
      </div>
    </div>
  );
}

export function Markdown({ text }: { text: string }) {
  const html = DOMPurify.sanitize(marked.parse(text, { async: false, gfm: true }) as string);
  return <div className="doc" dangerouslySetInnerHTML={{ __html: html }} />;
}

let toastSet: ((s: string) => void) | null = null;
export const toast = (s: string) => toastSet?.(s);
export function Toaster() {
  const [msg, setMsg] = useState('');
  useEffect(() => { toastSet = setMsg; return () => { toastSet = null; }; }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2600); return () => clearTimeout(t); }, [msg]);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {(error || help) && <div className={`help ${error ? 'error' : ''}`}>{error || help}</div>}
    </div>
  );
}

export const PageHead = ({ over, title, sub, right }: { over?: string; title: string; sub?: string; right?: ReactNode }) => (
  <div className="page-head">
    <div className="row between start gap-lg wrap">
      <div className="stack gap-sm">
        {over && <div className="overline t-brand">{over}</div>}
        <h1 className="display-lg">{title}</h1>
        {sub && <p className="body-lg t-secondary" style={{ maxWidth: 760 }}>{sub}</p>}
      </div>
      {right && <div className="row gap-sm wrap">{right}</div>}
    </div>
  </div>
);
