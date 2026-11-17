import { useMemo, useState } from 'react';
import { go } from '../App';
import { useT } from '../i18n';
import { KIND_LABEL, search, type Hit } from '../knowledge';
import { newProject } from '../samples';
import { store, useStore } from '../store';
import type { Answers, Product, Project } from '../types';
import { Badge, Button, Field, PhaseChip } from '../ui';

const QUESTIONS: { key: keyof Answers; q: string; hint: string; ph: string; probe: string }[] = [
  { key: 'affected', q: 'Who is affected by this problem?', hint: 'List user groups and teams, separated by commas. The first one becomes the main persona.', ph: 'e.g. Mobile shoppers, Customer service agents', probe: 'persona users customers role segment team' },
  { key: 'pain', q: 'What is the pain today, and what evidence do you have?', hint: 'Numbers, complaints, tickets, observations.', ph: 'e.g. 68% leave at checkout; top complaint is forced registration', probe: 'pain problem complaint abandon ticket finding quote drop' },
  { key: 'metric', q: 'How will you know it worked?', hint: 'One measurable outcome with baseline and target if you know them.', ph: 'e.g. Mobile checkout completion from 32% to 38%', probe: 'kpi metric rate conversion baseline target' },
  { key: 'constraints', q: 'What constraints do we have?', hint: 'Deadline, budget, regulation, technology, people.', ph: 'e.g. Live before 12.12 sale; PCI-DSS; no new vendor', probe: 'must constraint regulation compliance deadline budget security' },
  { key: 'tried', q: 'What has been tried before?', hint: 'Helps avoid repeating what failed.', ph: 'e.g. Shortened address form last year', probe: 'release tried experiment previous changelog launched' },
];

const OUTCOME = /(reduce|increase|improve|grow|cut|decrease|lower|raise|enable|achieve|faster|fewer|more|less|save|retain|convert|%)/i;
const SOLUTION = /^(build|create|develop|make|add|implement|launch|we need|need|i want an?|an? (app|website|system|dashboard|feature))/i;

export function NewProject({ prod }: { prod: Product }) {
  const t = useT();
  const { projects } = useStore();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState(0);
  const [p, setP] = useState<Project>(() => newProject({ productId: prod.id, domain: prod.domain, productType: prod.productType, stage: prod.stage }));
  const [featureText, setFeatureText] = useState('');
  const up = (patch: Partial<Project>) => setP((x) => ({ ...x, ...patch }));
  const looksLikeSolution = p.intent.length > 8 && SOLUTION.test(p.intent.trim()) && !OUTCOME.test(p.intent);
  const pr = prod.profile;

  // product-wide knowledge relevant to the intent (and to the current question)
  const probe = step === 2 ? `${p.intent} ${QUESTIONS[q].probe}` : `${p.intent} ${featureText}`;
  const hits = useMemo(() => (p.intent.trim().length > 6 ? search(prod, projects, probe, { k: 6 }) : []), [prod, projects, probe, p.intent]);

  const suggestions: Record<keyof Answers, string[]> = {
    affected: pr.personas,
    pain: hits.filter((h) => h.chunk.kind === 'doc' && /research|support|analytics/i.test(h.chunk.category || '')).map((h) => h.chunk.text.split('\n').find((l) => /\d|"/.test(l))?.replace(/^[-*\d.\s]+/, '').trim() || '').filter((x) => x && x.length < 200).slice(0, 3),
    metric: pr.kpis,
    constraints: pr.constraints,
    tried: projects.filter((x) => x.productId === prod.id).flatMap((x) => x.changelog.map((c) => `${c.title} (${x.name}, ${c.date})`)).slice(0, 4),
  };

  const addAnswer = (k: keyof Answers, v: string) => up({ answers: { ...p.answers, [k]: p.answers[k] ? `${p.answers[k]}${k === 'affected' ? ', ' : '; '}${v}` : v } });

  const finish = () => {
    const name = p.name === 'Untitled initiative' ? p.intent.split(/\s+/).slice(0, 5).join(' ') : p.name;
    const proj = { ...p, name, features: featureText.split('\n').map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean) };
    store.addProject(proj);
    go(`/p/${proj.id}/actions`);
  };

  return (
    <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', alignItems: 'start', gap: 32 }}>
      <div className="stack gap-xl">
        <div className="rail">
          {['Business intent', 'Context', 'Clarify'].map((s, i) => <span key={s} className={`chip ${i <= step ? 'phase-discover' : 'tone-neutral'} ${i === step ? 'active' : ''}`}><span className="dot" />{i + 1}. {s}</span>)}
        </div>

        {step === 0 && (
          <div className="stack gap-lg">
            <div className="overline t-brand">{prod.name} · New initiative · Step 1</div>
            <h1 className="display-lg">{t('What outcome does the business want?')}</h1>
            <Field label="Business intent" help={looksLikeSolution ? undefined : 'Describe the outcome, not the solution. Good: "Reduce support calls about order status by 30%".'} error={looksLikeSolution ? 'This sounds like a solution. What business outcome should it achieve? (e.g. "reduce…", "increase…")' : undefined}>
              <textarea className={`textarea ${looksLikeSolution ? 'error' : ''}`} autoFocus value={p.intent} onChange={(e) => up({ intent: e.target.value })} placeholder="e.g. Reduce checkout drop-off by 20% this quarter" />
            </Field>
            {!p.intent && (
              <div className="stack gap-sm">
                <div className="label-sm t-tertiary">Examples</div>
                <div className="row gap-sm wrap">
                  {['Reduce customer onboarding time from 5 days to 1 day', 'Increase repeat purchases by 15%', 'Cut support tickets about order status by 30%'].map((x) => (
                    <button key={x} className="badge tone-neutral" style={{ border: 0, cursor: 'pointer' }} onClick={() => up({ intent: x })}>{x}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="row gap-sm"><Button variant="primary" disabled={p.intent.trim().length < 8} onClick={() => setStep(1)}>{t('Continue')}</Button><Button variant="ghost" onClick={() => go(`/prod/${prod.id}`)}>Cancel</Button></div>
          </div>
        )}

        {step === 1 && (
          <div className="stack gap-lg">
            <div className="overline t-brand">Step 2 · Context</div>
            <h1 className="h1">Scope this initiative</h1>
            <Field label="Initiative name"><input className="input" value={p.name === 'Untitled initiative' ? '' : p.name} placeholder={p.intent.split(/\s+/).slice(0, 5).join(' ')} onChange={(e) => up({ name: e.target.value || 'Untitled initiative' })} /></Field>
            <Field label="Size of change" help="Compass skips heavy documents (BRD, full business case) for small changes.">
              <div className="row gap-sm wrap">
                {([['small', 'Small · a few weeks'], ['medium', 'Medium · 1–3 months'], ['large', 'Large · programme / contract']] as const).map(([k, l]) => (
                  <button key={k} className="option" aria-pressed={p.size === k} onClick={() => up({ size: k })}>{l}</button>
                ))}
              </div>
            </Field>
            <Field label="Capabilities you have in mind (optional)" help="One per line. Used to draft scope, screens and user stories.">
              <textarea className="textarea" value={featureText} onChange={(e) => setFeatureText(e.target.value)} placeholder={'Guest checkout without account\nSaved addresses and one-tap payment'} />
            </Field>
            {pr.modules.length > 0 && (
              <div className="stack gap-xs"><span className="label-sm t-tertiary">Existing modules in {prod.name} — click to add</span>
                <div className="row gap-xs wrap">{pr.modules.map((m) => <button key={m} className="badge tone-brand" style={{ border: 0, cursor: 'pointer' }} onClick={() => setFeatureText((x) => (x ? x + '\n' : '') + m)}>+ {m}</button>)}</div>
              </div>
            )}
            <div className="row gap-sm"><Button variant="primary" onClick={() => setStep(2)}>{t('Continue')}</Button><Button variant="ghost" onClick={() => setStep(0)}>{t('Back')}</Button></div>
          </div>
        )}

        {step === 2 && (
          <div className="stack gap-lg">
            <div className="row gap-sm"><span className="overline t-brand">Step 3 · Clarify</span><Badge>Question {q + 1} of {QUESTIONS.length}</Badge><PhaseChip phase="discover" /></div>
            <h1 className="h1">{QUESTIONS[q].q}</h1>
            <Field label="Your answer" help={QUESTIONS[q].hint}>
              <textarea className="textarea" key={q} autoFocus value={p.answers[QUESTIONS[q].key] || ''} placeholder={QUESTIONS[q].ph} onChange={(e) => up({ answers: { ...p.answers, [QUESTIONS[q].key]: e.target.value } })} />
            </Field>
            {suggestions[QUESTIONS[q].key].length > 0 && (
              <div className="stack gap-xs"><span className="label-sm t-tertiary">From {prod.name}'s knowledge — click to use</span>
                <div className="row gap-xs wrap">{suggestions[QUESTIONS[q].key].map((s) => <button key={s} className="badge tone-info" style={{ border: 0, cursor: 'pointer', textAlign: 'left', whiteSpace: 'normal' }} onClick={() => addAnswer(QUESTIONS[q].key, s)}>+ {s}</button>)}</div>
              </div>
            )}
            <div className="row gap-sm wrap">
              {q < QUESTIONS.length - 1 ? <Button variant="primary" onClick={() => setQ(q + 1)}>{t('Continue')}</Button> : <Button variant="accent" onClick={finish}>See suggested next actions</Button>}
              {q < QUESTIONS.length - 1 && <Button variant="secondary" onClick={() => setQ(q + 1)}>{t('Skip')}</Button>}
              <Button variant="ghost" onClick={finish}>Skip — suggest anyway</Button>
              <Button variant="ghost" onClick={() => (q ? setQ(q - 1) : setStep(1))}>{t('Back')}</Button>
            </div>
          </div>
        )}
      </div>

      <FoundPanel prod={prod} hits={hits} hasIntent={p.intent.trim().length > 6} />
    </div>
  );
}

function FoundPanel({ prod, hits, hasIntent }: { prod: Product; hits: Hit[]; hasIntent: boolean }) {
  return (
    <aside className="card stack gap-md" style={{ position: 'sticky', top: 24, background: 'var(--color-bg-subtle)', borderColor: 'transparent' }}>
      <div className="stack gap-xs">
        <div className="overline t-brand">Found in {prod.name}</div>
        <div className="body-sm t-tertiary">Compass searches all documents and every initiative of this product as you type.</div>
      </div>
      {!hasIntent ? <div className="body-sm t-tertiary">Start typing your business intent…</div>
        : hits.length === 0 ? <div className="body-sm t-tertiary">Nothing related yet — this looks like new ground. Discovery actions will be recommended.</div>
        : hits.map((h) => (
          <div key={h.chunk.id} className="card stack gap-xs" style={{ padding: 12 }}>
            <div className="row gap-xs wrap"><Badge tone={h.chunk.kind === 'doc' ? 'info' : 'brand'}>{h.chunk.category || KIND_LABEL[h.chunk.kind]}</Badge>{h.chunk.initiativeName && <Badge tone="accent">{h.chunk.initiativeName}</Badge>}</div>
            <div className="label-sm">{h.chunk.title}{h.chunk.section ? ` › ${h.chunk.section}` : ''}</div>
            <div className="body-sm t-secondary">{h.chunk.text.replace(/\s+/g, ' ').slice(0, 180)}…</div>
          </div>
        ))}
    </aside>
  );
}
