import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Design, Requirement, Stage } from './types';

type BtnStyle = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'primary', size, children, ...rest }: { variant?: BtnStyle; size?: 'sm' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn ${variant} ${size || ''}`} {...rest}>{children}</button>;
}

export type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
/** One colour per status meaning (REQ-013): Draft is still to approve (neutral), Approved and Done are settled (mint). */
export const REQ_STATUS_TONE: Record<Requirement['status'], Tone> = { Draft: 'neutral', Approved: 'success', 'In build': 'info', Done: 'success' };
export const DESIGN_STATUS_TONE: Record<Design['status'], Tone> = { Draft: 'neutral', Approved: 'success' };
export const Badge = ({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) => <span className={`badge tone-${tone}`} title={title}>{children}</span>;

export const STAGE_INFO: Record<Stage, { name: string; vi: string; cls: string; role: string; agent: string }> = {
  idea: { name: 'Idea', vi: 'Ý tưởng', cls: 'phase-discover', role: 'PO', agent: 'Ideation agent' },
  requirements: { name: 'Requirements', vi: 'Yêu cầu', cls: 'phase-define', role: 'BA', agent: 'Requirements agent' },
  design: { name: 'Design', vi: 'Thiết kế', cls: 'phase-design', role: 'UX', agent: 'Design agent' },
  tests: { name: 'Test cases', vi: 'Test case', cls: 'phase-monitor', role: 'QA', agent: 'Test design agent' },
  build: { name: 'Build', vi: 'Lập trình', cls: 'phase-build', role: 'Dev', agent: 'Coding agent' },
  release: { name: 'Release', vi: 'Phát hành', cls: 'phase-release', role: 'DM', agent: 'Release agent' },
};

export function StageChip({ stage, active, done, onClick }: { stage: Stage; active?: boolean; done?: boolean; onClick?: () => void }) {
  const cls = `chip ${STAGE_INFO[stage].cls} ${active ? 'active' : ''}`;
  const inner = <>{done ? <span aria-hidden>✓</span> : <span className="dot" />}{STAGE_INFO[stage].name}</>;
  return onClick ? <button className={cls} onClick={onClick}>{inner}</button> : <span className={cls}>{inner}</span>;
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
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 3200); return () => clearTimeout(t); }, [msg]);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function Field({ label, help, error, children }: { label: string; help?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {(error || help) && <div className={`help ${error ? 'error' : ''}`}>{error || help}</div>}
    </div>
  );
}

export const PageHead = ({ over, title, sub, right }: { over?: string; title: string; sub?: ReactNode; right?: ReactNode }) => (
  <div className="page-head">
    <div className="row between start gap-lg wrap">
      <div className="stack gap-sm" style={{ minWidth: 0 }}>
        {over && <div className="overline t-brand">{over}</div>}
        <h1 className="display-lg">{title}</h1>
        {sub && <p className="body-lg t-secondary" style={{ maxWidth: 780 }}>{sub}</p>}
      </div>
      {right && <div className="row gap-sm wrap">{right}</div>}
    </div>
  </div>
);

/** Run an async action with busy state + toast on error. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    try { const msg = await fn(); if (msg) toast(msg); }
    catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };
  return { busy, run };
}

/** Very small line diff (LCS) for change review. */
export function Diff({ before = '', after }: { before?: string; after: string }) {
  const a = before.split('\n'), b = after.split('\n');
  if (a.length * b.length > 400_000) return <pre className="diff">{after}</pre>;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const rows: { t: ' ' | '+' | '-'; s: string }[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { rows.push({ t: ' ', s: a[i] }); i++; j++; }
    else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) { rows.push({ t: '+', s: b[j++] }); }
    else rows.push({ t: '-', s: a[i++] });
  }
  return <pre className="diff">{rows.map((r, k) => <div key={k} className={r.t === '+' ? 'add' : r.t === '-' ? 'del' : ''}>{r.t} {r.s}</div>)}</pre>;
}

export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
};
