import { useState } from 'react';
import { go } from '../App';
import { useT } from '../i18n';
import { newProject } from '../samples';
import { store } from '../store';
import type { Answers, Project } from '../types';
import { Badge, Button, Field, PhaseChip } from '../ui';

const QUESTIONS: { key: keyof Answers; q: string; hint: string; ph: string }[] = [
  { key: 'affected', q: 'Who is affected by this problem?', hint: 'List user groups and teams, separated by commas. The first one becomes the main persona.', ph: 'e.g. Mobile shoppers, Customer service agents' },
  { key: 'pain', q: 'What is the pain today, and what evidence do you have?', hint: 'Numbers, complaints, tickets, observations.', ph: 'e.g. 68% leave at checkout; top complaint is forced registration' },
  { key: 'metric', q: 'How will you know it worked?', hint: 'One measurable outcome with baseline and target if you know them.', ph: 'e.g. Mobile checkout completion from 32% to 38%' },
  { key: 'constraints', q: 'What constraints do we have?', hint: 'Deadline, budget, regulation, technology, people.', ph: 'e.g. Live before 12.12 sale; PCI-DSS; no new vendor' },
  { key: 'tried', q: 'What has been tried before?', hint: 'Helps avoid repeating what failed.', ph: 'e.g. Shortened address form last year' },
];

const OUTCOME = /(reduce|increase|improve|grow|cut|decrease|lower|raise|enable|achieve|faster|fewer|more|less|save|retain|convert|%)/i;
const SOLUTION = /^(build|create|develop|make|add|implement|launch|we need|need|i want an?|an? (app|website|system|dashboard|feature))/i;

export function NewProject() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState(0);
  const [p, setP] = useState<Project>(() => newProject({}));
  const [featureText, setFeatureText] = useState('');
  const up = (patch: Partial<Project>) => setP((x) => ({ ...x, ...patch }));
  const looksLikeSolution = p.intent.length > 8 && SOLUTION.test(p.intent.trim()) && !OUTCOME.test(p.intent);

  const finish = () => {
    const name = p.name === 'Untitled project' ? p.intent.split(/\s+/).slice(0, 5).join(' ') : p.name;
    const proj = { ...p, name, features: featureText.split('\n').map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean) };
    store.addProject(proj);
    go(`/p/${proj.id}/actions`);
  };

  return (
    <div style={{ maxWidth: 760 }} className="stack gap-xl">
      <div className="rail">
        {['Business intent', 'Context', 'Clarify'].map((s, i) => <span key={s} className={`chip ${i <= step ? 'phase-discover' : 'tone-neutral'} ${i === step ? 'active' : ''}`}><span className="dot" />{i + 1}. {s}</span>)}
      </div>

      {step === 0 && (
        <div className="stack gap-lg">
          <div className="overline t-brand">Step 1 · Business intent</div>
          <h1 className="display-lg">{t('What outcome does the business want?')}</h1>
          <Field label="Business intent" help={looksLikeSolution ? undefined : 'Describe the outcome, not the solution. Good: "Reduce support calls about order status by 30%".'} error={looksLikeSolution ? 'This sounds like a solution. What business outcome should it achieve? (e.g. "reduce…", "increase…")' : undefined}>
            <textarea className={`textarea ${looksLikeSolution ? 'error' : ''}`} autoFocus value={p.intent} onChange={(e) => up({ intent: e.target.value })} placeholder="e.g. Reduce checkout drop-off by 20% this quarter" />
          </Field>
          <div className="stack gap-sm">
            <div className="label-sm t-tertiary">Examples</div>
            <div className="row gap-sm wrap">
              {['Reduce customer onboarding time from 5 days to 1 day', 'Increase repeat purchases of B2B clients by 15%', 'Cut manual invoice processing effort by half'].map((x) => (
                <button key={x} className="badge tone-neutral" style={{ border: 0, cursor: 'pointer' }} onClick={() => up({ intent: x })}>{x}</button>
              ))}
            </div>
          </div>
          <div className="row gap-sm"><Button variant="primary" disabled={p.intent.trim().length < 8} onClick={() => setStep(1)}>{t('Continue')}</Button><Button variant="ghost" onClick={() => go('/')}>Cancel</Button></div>
        </div>
      )}

      {step === 1 && (
        <div className="stack gap-lg">
          <div className="overline t-brand">Step 2 · Context</div>
          <h1 className="h1">Tell me a bit about the product</h1>
          <Field label="Project name"><input className="input" value={p.name === 'Untitled project' ? '' : p.name} placeholder={p.intent.split(/\s+/).slice(0, 5).join(' ')} onChange={(e) => up({ name: e.target.value || 'Untitled project' })} /></Field>
          <Field label="Domain / industry"><input className="input" value={p.domain} placeholder="e.g. Banking, E-commerce, Logistics, HR" onChange={(e) => up({ domain: e.target.value })} /></Field>
          <div className="grid-2">
            <Field label="Product type"><select className="select" value={p.productType} onChange={(e) => up({ productType: e.target.value as Project['productType'] })}><option>B2C</option><option>B2B</option><option>Internal</option></select></Field>
            <Field label="Stage"><select className="select" value={p.stage} onChange={(e) => up({ stage: e.target.value as Project['stage'] })}><option>Idea</option><option>Existing product</option><option>Live feature</option></select></Field>
          </div>
          <Field label="Size of change" help="Compass skips heavy documents (BRD, full business case) for small changes.">
            <div className="row gap-sm wrap">
              {([['small', 'Small · a few weeks'], ['medium', 'Medium · 1–3 months'], ['large', 'Large · programme / contract']] as const).map(([k, l]) => (
                <button key={k} className="option" aria-pressed={p.size === k} onClick={() => up({ size: k })}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Capabilities you have in mind (optional)" help="One per line. Used to draft scope, screens and user stories. You can change them later.">
            <textarea className="textarea" value={featureText} onChange={(e) => setFeatureText(e.target.value)} placeholder={'Guest checkout without account\nSaved addresses and one-tap payment'} />
          </Field>
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
          <div className="row gap-sm wrap">
            {q < QUESTIONS.length - 1 ? <Button variant="primary" onClick={() => setQ(q + 1)}>{t('Continue')}</Button> : <Button variant="accent" onClick={finish}>See suggested next actions</Button>}
            {q < QUESTIONS.length - 1 && <Button variant="secondary" onClick={() => setQ(q + 1)}>{t('Skip')}</Button>}
            <Button variant="ghost" onClick={finish}>Skip — suggest anyway</Button>
            <Button variant="ghost" onClick={() => (q ? setQ(q - 1) : setStep(1))}>{t('Back')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
