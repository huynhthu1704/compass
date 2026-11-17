import { useEffect, useState } from 'react';
import { go, query } from '../App';
import { ACTIONS, byId, isDone, PHASE_INFO, ROLE_INFO } from '../catalog';
import { suggest } from '../engine';
import { useT } from '../i18n';
import { runAction } from '../run';
import { store, useStore } from '../store';
import { PHASES, type Answers, type Phase, type Project } from '../types';
import { ActionCard, Badge, Button, Field, PageHead, PhaseChip, toast } from '../ui';

const MORE_QS: { key: keyof Answers; q: string }[] = [
  { key: 'affected', q: 'Who is affected by this problem?' },
  { key: 'pain', q: 'What is the pain today, and what evidence do you have?' },
  { key: 'metric', q: 'How will you know it worked (baseline → target)?' },
  { key: 'constraints', q: 'What constraints do we have (deadline, budget, regulation)?' },
  { key: 'tried', q: 'What has been tried before?' },
];

export function ActionsPage({ p }: { p: Project }) {
  const t = useT();
  const { settings } = useStore();
  const [filter, setFilter] = useState<Phase | 'all'>((query().get('phase') as Phase) || 'all');
  const [sel, setSel] = useState<string | null>(query().get('select'));
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const on = () => { const q = query(); if (q.get('select')) setSel(q.get('select')); if (q.get('phase')) setFilter(q.get('phase') as Phase); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const sug = suggest(p, settings.role);
  const visible = sug.filter((s) => filter === 'all' || s.action.phase === filter);
  const completed = ACTIONS.filter((a) => (filter === 'all' || a.phase === filter) && isDone(p, a.id));
  const selected = sel ? byId(sel) : null;
  const selSug = sug.find((s) => s.action.id === sel);
  const unknown = MORE_QS.filter((q) => !p.answers[q.key]);

  const generate = async (ai: boolean) => {
    if (!selected) return;
    setBusy(true);
    try {
      const path = await runAction(p, selected.id, ai);
      toast(selected.kind === 'stories' ? 'User stories added to the backlog' : selected.kind === 'navigate' ? 'Opening…' : 'Artefact generated');
      go(path);
    } catch (e) {
      toast((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="stack gap-xl" style={{ paddingBottom: selected ? 260 : 0 }}>
      <PageHead over={`Step · ${PHASE_INFO[selSug?.action.phase || 'discover'].name}`} title={t('Suggested next actions')} sub="Based on what you've told Compass and the artefacts already done. Pick one — Compass generates the result. Exactly one action is recommended." />

      <div className="row gap-sm wrap">
        <button className={`chip tone-neutral ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All phases</button>
        {PHASES.map((ph) => <PhaseChip key={ph} phase={ph} active={filter === ph} onClick={() => setFilter(ph)} />)}
      </div>

      {filter !== 'all' && <div className="panel body-sm t-secondary"><strong>{PHASE_INFO[filter].name}:</strong> {PHASE_INFO[filter].goal} <span className="mono-sm t-tertiary"> · {PHASE_INFO[filter].babok}</span></div>}

      {visible.length === 0 ? <div className="empty">Everything in this phase is done or skipped.</div> : (
        <div className="grid-3">
          {visible.map((s) => (
            <ActionCard key={s.action.id} action={s.action} reason={s.reason} recommended={s.recommended} urgent={s.urgent} selected={sel === s.action.id} blockedBy={s.blockedBy.map((b) => byId(b).title)} onClick={() => { setSel(s.action.id); setAsking(false); }} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <section className="stack gap-md">
          <h2 className="h3">Completed</h2>
          <div className="grid-3">
            {completed.map((a) => <ActionCard key={a.id} action={a} done selected={sel === a.id} onClick={() => setSel(a.id)} />)}
          </div>
        </section>
      )}

      {p.skipped.length > 0 && (
        <div className="row gap-sm wrap"><span className="label-sm t-tertiary">Skipped:</span>{p.skipped.map((id) => <button key={id} className="badge tone-neutral" style={{ border: 0, cursor: 'pointer' }} onClick={() => store.updateProject(p.id, (x) => ({ ...x, skipped: x.skipped.filter((y) => y !== id) }))}>{byId(id).title} ↺</button>)}</div>
      )}

      {selected && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, display: 'flex', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
          <div className="card elev stack gap-md" style={{ width: 'min(980px, 100%)', boxShadow: 'var(--elevation-3)', pointerEvents: 'auto' }}>
            <div className="row gap-sm wrap">
              <PhaseChip phase={selected.phase} />
              {selSug?.recommended && <Badge tone="accent">★ Recommended</Badge>}
              <span className="h4">{selected.title}</span>
              <span className="grow" />
              <button className="btn ghost sm" onClick={() => setSel(null)} aria-label="Close">✕</button>
            </div>
            {!asking ? (
              <>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="body-sm"><span className="t-tertiary">Why now: </span>{selSug?.reason || selected.why}</div>
                  <div className="body-sm"><span className="t-tertiary">You'll get: </span>{selected.output}</div>
                  <div className="body-sm"><span className="t-tertiary">Owner: </span>{selected.owners.map((o) => ROLE_INFO[o].name).join(', ')} · {selected.effort}</div>
                  <div className="mono-sm t-tertiary">{selected.babok}</div>
                </div>
                {selSug && selSug.blockedBy.length > 0 && <div className="body-sm t-accent">Tip: best done after {selSug.blockedBy.map((b) => byId(b).title).join(', ')}. You can still go ahead.</div>}
                <div className="row gap-sm wrap">
                  <Button variant="accent" disabled={busy} onClick={() => generate(false)}>{busy ? 'Generating…' : isDone(p, selected.id) && selected.kind !== 'stories' ? 'Regenerate' : selected.kind === 'navigate' ? 'Open' : selected.kind === 'stories' ? 'Generate user stories' : t('Generate')}</Button>
                  {settings.apiKey && selected.kind !== 'navigate' && <Button variant="primary" disabled={busy} onClick={() => generate(true)}>✦ Generate with Claude</Button>}
                  {isDone(p, selected.id) && selected.kind !== 'navigate' && <Button variant="secondary" onClick={() => go(selected.kind === 'stories' ? `/p/${p.id}/backlog` : `/p/${p.id}/a/${p.artefacts.find((a) => a.actionId === selected.id)?.id}`)}>View result</Button>}
                  {unknown.length > 0 && <Button variant="secondary" onClick={() => setAsking(true)}>{t('Ask me more questions')} ({unknown.length})</Button>}
                  {!isDone(p, selected.id) && <Button variant="ghost" onClick={() => { store.updateProject(p.id, (x) => ({ ...x, skipped: [...x.skipped, selected.id] })); setSel(null); }}>{t('Skip')}</Button>}
                  {!isDone(p, 'user-stories') && selected.id !== 'user-stories' && <Button variant="ghost" onClick={() => setSel('user-stories')}>Skip to user stories</Button>}
                </div>
              </>
            ) : (
              <MoreQuestions p={p} onDone={() => setAsking(false)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MoreQuestions({ p, onDone }: { p: Project; onDone: () => void }) {
  const unknown = MORE_QS.filter((q) => !p.answers[q.key]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const q = unknown[i];
  if (!q) return <div className="row gap-md"><span className="body-sm">No open questions — thanks!</span><Button size="sm" onClick={onDone}>Back to action</Button></div>;
  const save = () => { if (val.trim()) store.updateProject(p.id, (x) => ({ ...x, answers: { ...x.answers, [q.key]: val.trim() } })); setVal(''); if (i + 1 >= unknown.length) onDone(); else setI(i + 1); };
  return (
    <div className="stack gap-md">
      <Field label={`${q.q}  (${i + 1}/${unknown.length})`}><input className="input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
      <div className="row gap-sm"><Button size="sm" onClick={save}>Save & next</Button><Button size="sm" variant="ghost" onClick={onDone}>Done</Button></div>
    </div>
  );
}

