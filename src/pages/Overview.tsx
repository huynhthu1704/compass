import { useState } from 'react';
import { go } from '../App';
import { PHASE_INFO, ROLE_INFO } from '../catalog';
import { alertState, currentPhase, phaseProgress, suggest, weekly } from '../engine';
import { download, projectToMarkdown } from '../generators';
import { useT } from '../i18n';
import { store, useStore } from '../store';
import { PHASES, type Project } from '../types';
import { ActionCard, Badge, Button, Field, PageHead, PhaseChip } from '../ui';

export function OverviewPage({ p }: { p: Project }) {
  const t = useT();
  const { settings } = useStore();
  const cur = currentPhase(p);
  const sug = suggest(p, settings.role);
  const rec = sug.find((s) => s.recommended);
  const alert = alertState(p);
  const [edit, setEdit] = useState(false);
  const w = p.metrics.length ? weekly(p.metrics) : null;

  return (
    <div className="stack gap-2xl">
      <PageHead
        over={`${p.domain || 'Project'} · ${p.productType} · ${p.stage}`}
        title={p.name}
        sub={p.intent}
        right={<>
          <Button variant="secondary" size="sm" onClick={() => setEdit(!edit)}>{edit ? 'Close' : 'Edit context'}</Button>
          <Button variant="ghost" size="sm" onClick={() => download(`${p.name}.md`, projectToMarkdown(p))}>{t('Export')} .md</Button>
        </>}
      />

      {edit && <EditContext p={p} />}

      <section className="stack gap-md">
        <div className="row between"><h2 className="h3">{t('Life cycle')}</h2><span className="body-sm t-tertiary">Viewing as {ROLE_INFO[settings.role!].name}</span></div>
        <div className="grid-6">
          {PHASES.map((ph) => {
            const pr = phaseProgress(p, ph);
            return (
              <button key={ph} className={`action-card ${ph === cur ? 'selected' : ''}`} onClick={() => go(`/p/${p.id}/actions?phase=${ph}`)} style={{ gap: 8 }}>
                <PhaseChip phase={ph} active={ph === cur} done={pr.done === pr.total} />
                <div className="progress"><span style={{ width: `${(pr.done / pr.total) * 100}%` }} /></div>
                <div className="mono-sm t-tertiary">{pr.done}/{pr.total} done</div>
                <div className="body-sm t-secondary">{PHASE_INFO[ph].roles}</div>
              </button>
            );
          })}
        </div>
      </section>

      {alert && (
        <div className="card stack gap-sm" style={{ borderColor: 'var(--color-border-danger)', background: 'var(--color-bg-danger-subtle)' }}>
          <div className="h4 t-danger">Usage alert: activations down {Math.abs(alert.drop).toFixed(0)}% week-on-week</div>
          <div className="body-sm t-secondary">Threshold is {p.alertThreshold}%. Compass moved investigation actions to the top of your list.</div>
          <div><Button size="sm" variant="secondary" onClick={() => go(`/p/${p.id}/monitor`)}>Open Monitor</Button></div>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="stack gap-md">
          <h2 className="h3">{t('Recommended next action')}</h2>
          {rec ? <ActionCard action={rec.action} reason={rec.reason} recommended urgent={rec.urgent} onClick={() => go(`/p/${p.id}/actions?select=${rec.action.id}`)} /> : <div className="empty">All actions done. 🎉</div>}
          <div className="stack gap-sm">
            {sug.filter((s) => !s.recommended && !s.blockedBy.length && s.score < 80).slice(0, 3).map((s) => (
              <button key={s.action.id} className="option" onClick={() => go(`/p/${p.id}/actions?select=${s.action.id}`)}>
                <PhaseChip phase={s.action.phase} />
                <span className="stack"><span className="label-md">{s.action.title}</span><span className="body-sm t-tertiary">{s.action.effort} · {s.action.owners.join(', ')}</span></span>
              </button>
            ))}
            <div><Button variant="ghost" onClick={() => go(`/p/${p.id}/actions`)}>See all actions →</Button></div>
          </div>
        </section>

        <section className="stack gap-md">
          <h2 className="h3">Project health</h2>
          <div className="card grid-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="kpi"><span className="label-sm t-tertiary">Artefacts</span><span className="v">{p.artefacts.length}</span><span className="body-sm t-tertiary">{p.artefacts.filter((a) => a.status === 'approved').length} approved</span></div>
            <div className="kpi"><span className="label-sm t-tertiary">User stories</span><span className="v">{p.stories.length}</span><span className="body-sm t-tertiary">{p.stories.filter((s) => s.status === 'Done').length} done</span></div>
            <div className="kpi"><span className="label-sm t-tertiary">Releases logged</span><span className="v">{p.changelog.filter((c) => c.type === 'release').length}</span><span className="body-sm t-tertiary">{p.changelog.length} changes</span></div>
            <div className="kpi"><span className="label-sm t-tertiary">Activation rate (7d)</span><span className="v">{w ? `${w.activationRate.toFixed(1)}%` : '–'}</span><span className="body-sm t-tertiary">{w ? `${w.wow >= 0 ? '+' : ''}${w.wow.toFixed(1)}% WoW` : 'no usage data'}</span></div>
          </div>
          <div className="card stack gap-sm">
            <div className="h4">Business need</div>
            {[['Affected', p.answers.affected], ['Pain & evidence', p.answers.pain], ['Success metric', p.answers.metric], ['Constraints', p.answers.constraints]].map(([k, v]) => (
              <div key={k} className="row gap-md start"><span className="label-sm t-tertiary" style={{ minWidth: 120 }}>{k}</span><span className="body-sm">{v || <Badge tone="warning">Unknown</Badge>}</span></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function EditContext({ p }: { p: Project }) {
  const up = (fn: (x: Project) => Project) => store.updateProject(p.id, fn);
  return (
    <div className="card pad-xl stack gap-lg">
      <div className="grid-2">
        <Field label="Project name"><input className="input" value={p.name} onChange={(e) => up((x) => ({ ...x, name: e.target.value }))} /></Field>
        <Field label="Domain"><input className="input" value={p.domain} onChange={(e) => up((x) => ({ ...x, domain: e.target.value }))} /></Field>
      </div>
      <Field label="Business intent"><textarea className="textarea" value={p.intent} onChange={(e) => up((x) => ({ ...x, intent: e.target.value }))} /></Field>
      <div className="grid-2">
        {(['affected', 'pain', 'metric', 'constraints', 'tried'] as const).map((k) => (
          <Field key={k} label={{ affected: 'Who is affected', pain: 'Pain & evidence', metric: 'Success metric', constraints: 'Constraints', tried: 'Tried before' }[k]}>
            <input className="input" value={p.answers[k] || ''} onChange={(e) => up((x) => ({ ...x, answers: { ...x.answers, [k]: e.target.value } }))} />
          </Field>
        ))}
        <Field label="Size of change"><select className="select" value={p.size} onChange={(e) => up((x) => ({ ...x, size: e.target.value as Project['size'] }))}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></Field>
      </div>
      <Field label="Capabilities (one per line)"><textarea className="textarea" value={p.features.join('\n')} onChange={(e) => up((x) => ({ ...x, features: e.target.value.split('\n') }))} onBlur={() => up((x) => ({ ...x, features: x.features.map((f) => f.trim()).filter(Boolean) }))} /></Field>
    </div>
  );
}
