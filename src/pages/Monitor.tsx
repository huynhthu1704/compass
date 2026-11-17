import { useRef } from 'react';
import { go } from '../App';
import { alertState, suggest, weekly } from '../engine';
import { download, sampleMetrics } from '../generators';
import { store, useStore } from '../store';
import type { MetricRow, Project } from '../types';
import { ActionCard, Badge, Button, Field, PageHead, toast } from '../ui';

function parseCSV(text: string): MetricRow[] {
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const idx = (k: string) => head.indexOf(k);
  if (idx('date') < 0) throw new Error('CSV needs a "date" column');
  return lines.slice(1).map((l) => {
    const c = l.split(',').map((x) => x.trim());
    const n = (k: string) => (idx(k) >= 0 ? Number(c[idx(k)]) || 0 : 0);
    return { date: c[idx('date')], exposed: n('exposed'), tried: n('tried'), activated: n('activated'), retained: n('retained') };
  }).filter((r) => r.date);
}

export function MonitorPage({ p }: { p: Project }) {
  const { settings } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const rows = [...p.metrics].sort((a, b) => a.date.localeCompare(b.date));
  const w = rows.length ? weekly(rows) : null;
  const alert = alertState(p);
  const actions = suggest(p, settings.role).filter((s) => s.action.phase === 'monitor' && s.score < 80).slice(0, 3);
  const released = p.changelog.some((c) => c.type === 'release');

  const upload = async (f: File) => {
    try { const r = parseCSV(await f.text()); store.updateProject(p.id, (x) => ({ ...x, metrics: r })); toast(`Loaded ${r.length} days of data`); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <div className="stack gap-xl">
      <PageHead
        over="Monitor · Solution evaluation"
        title="Usage & performance"
        sub="Adoption funnel, trends and every change you shipped — so you can decide to scale, iterate or roll back."
        right={<>
          <Button variant="secondary" size="sm" onClick={() => file.current?.click()}>Upload CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => { store.updateProject(p.id, (x) => ({ ...x, metrics: sampleMetrics(x) })); toast('Sample data loaded'); }}>Load sample data</Button>
          {rows.length > 0 && <Button variant="ghost" size="sm" onClick={() => store.updateProject(p.id, (x) => ({ ...x, metrics: [] }))}>Clear</Button>}
          <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </>}
      />

      {!released && <div className="panel body-sm t-secondary">No release logged yet. Log releases and changes in <button className="btn ghost sm" onClick={() => go(`/p/${p.id}/release`)}>Plan & Release</button> so they appear on the charts.</div>}

      {alert && (
        <div className="card stack gap-sm" style={{ borderColor: 'var(--color-border-danger)', background: 'var(--color-bg-danger-subtle)' }}>
          <div className="h4 t-danger">Alert: activations down {Math.abs(alert.drop).toFixed(1)}% week-on-week (threshold {p.alertThreshold}%)</div>
          <div className="body-sm t-secondary">Check the change log below for anything shipped in the last 7 days, then pick an investigation action.</div>
        </div>
      )}

      {!rows.length ? (
        <div className="empty stack gap-md" style={{ alignItems: 'center' }}>
          <div className="h4" style={{ color: 'var(--color-text-primary)' }}>No usage data yet</div>
          <p>Upload a CSV with columns <code className="mono">date, exposed, tried, activated, retained</code> (one row per day), or load sample data.</p>
          <Button variant="ghost" size="sm" onClick={() => download('compass-usage-template.csv', 'date,exposed,tried,activated,retained\n2026-11-01,400,180,110,44\n', 'text/csv')}>Download CSV template</Button>
        </div>
      ) : w && (
        <>
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            <Kpi label="Exposed users (7d)" value={w.cur.exposed.toLocaleString()} delta={w.prev.exposed ? ((w.cur.exposed - w.prev.exposed) / w.prev.exposed) * 100 : undefined} />
            <Kpi label="Try rate" value={`${w.tryRate.toFixed(1)}%`} />
            <Kpi label="Activation rate" value={`${w.activationRate.toFixed(1)}%`} delta={w.hasPrev ? w.wow : undefined} deltaLabel="activations WoW" />
            <Kpi label="Retention" value={`${w.retention.toFixed(1)}%`} />
          </div>

          <section className="card pad-xl stack gap-md">
            <div className="row between wrap gap-sm"><h2 className="h3">Daily trend</h2>
              <div className="row gap-md body-sm"><Legend c="var(--color-border-strong)" l="Exposed" /><Legend c="var(--color-phase-define-fg)" l="Tried" /><Legend c="var(--color-bg-brand)" l="Activated" /><Legend c="var(--color-bg-accent)" l="Change / release" dashed /></div>
            </div>
            <Chart rows={rows} p={p} />
          </section>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            <section className="card pad-xl stack gap-md">
              <h2 className="h3">Adoption funnel (7d)</h2>
              {([['Exposed', w.cur.exposed], ['Tried', w.cur.tried], ['Activated', w.cur.activated], ['Retained', w.cur.retained]] as const).map(([l, v], i, arr) => (
                <div key={l} className="stack gap-xs">
                  <div className="row between body-sm"><span>{l}</span><span className="mono">{v.toLocaleString()} {i > 0 && <span className="t-tertiary">({arr[i - 1][1] ? ((v / arr[i - 1][1]) * 100).toFixed(0) : 0}% of prev)</span>}</span></div>
                  <div className="progress" style={{ height: 14 }}><span style={{ width: `${w.cur.exposed ? (v / w.cur.exposed) * 100 : 0}%`, background: ['var(--color-border-strong)', 'var(--color-phase-define-fg)', 'var(--color-bg-brand)', 'var(--color-phase-monitor-fg)'][i] }} /></div>
                </div>
              ))}
            </section>
            <section className="card pad-xl stack gap-md">
              <h2 className="h3">Alert rule</h2>
              <Field label="Alert when activations drop week-on-week by more than (%)" help="Needs at least 14 days of data.">
                <input className="input" type="number" min={1} max={90} value={p.alertThreshold} onChange={(e) => store.updateProject(p.id, (x) => ({ ...x, alertThreshold: Math.max(1, +e.target.value) }))} />
              </Field>
              <div className="row gap-sm"><span className="body-sm t-tertiary">Status:</span>{alert ? <Badge tone="danger">Triggered</Badge> : <Badge tone="success">OK</Badge>}</div>
              <h3 className="h4">Recent changes</h3>
              {p.changelog.length ? [...p.changelog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((c) => <div key={c.id} className="row gap-sm body-sm"><span className="mono t-tertiary">{c.date}</span><Badge>{c.type}</Badge><span>{c.title}</span><span className="mono t-tertiary">{c.rollout}%</span></div>) : <div className="body-sm t-tertiary">None logged.</div>}
            </section>
          </div>
        </>
      )}

      {actions.length > 0 && (
        <section className="stack gap-md">
          <h2 className="h3">Suggested next actions</h2>
          <div className="grid-3">{actions.map((s) => <ActionCard key={s.action.id} action={s.action} reason={s.reason} recommended={s.recommended} urgent={s.urgent} onClick={() => go(`/p/${p.id}/actions?select=${s.action.id}`)} />)}</div>
        </section>
      )}
    </div>
  );
}

const Legend = ({ c, l, dashed }: { c: string; l: string; dashed?: boolean }) => <span className="row gap-xs"><span style={{ width: 14, height: 0, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${c}` }} />{l}</span>;

function Kpi({ label, value, delta, deltaLabel = 'vs prev 7d' }: { label: string; value: string; delta?: number; deltaLabel?: string }) {
  return (
    <div className="card kpi">
      <span className="label-sm t-tertiary">{label}</span>
      <span className="v">{value}</span>
      {delta !== undefined && <span className={`body-sm ${delta < 0 ? 't-danger' : 't-success'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% {deltaLabel}</span>}
    </div>
  );
}

function Chart({ rows, p }: { rows: MetricRow[]; p: Project }) {
  const W = 900, H = 260, L = 44, R = 12, T = 16, B = 28;
  const max = Math.max(...rows.map((r) => r.exposed), 1) * 1.1;
  const x = (i: number) => L + (i / Math.max(rows.length - 1, 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = (k: keyof MetricRow) => rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(r[k])).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const marks = p.changelog.map((c) => ({ c, i: rows.findIndex((r) => r.date >= c.date) })).filter((m) => m.i >= 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Daily exposed, tried and activated users with change annotations">
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-border-subtle)" /><text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">{t}</text></g>)}
      {rows.map((r, i) => (i % Math.ceil(rows.length / 8) === 0 ? <text key={r.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">{r.date.slice(5)}</text> : null))}
      {marks.map(({ c, i }) => <g key={c.id}><line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="var(--color-bg-accent)" strokeDasharray="4 3" strokeWidth="1.5" /><text x={x(i) + 4} y={T + 10 + (marks.findIndex((m) => m.c.id === c.id) % 3) * 12} fontSize="10" fill="var(--color-text-accent)">{c.title.slice(0, 40)}</text></g>)}
      <path d={line('exposed')} fill="none" stroke="var(--color-border-strong)" strokeWidth="2" />
      <path d={line('tried')} fill="none" stroke="var(--color-phase-define-fg)" strokeWidth="2" />
      <path d={line('activated')} fill="none" stroke="var(--color-bg-brand)" strokeWidth="2.5" />
    </svg>
  );
}
