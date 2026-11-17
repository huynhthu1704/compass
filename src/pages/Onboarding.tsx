import { useState } from 'react';
import { PHASE_INFO, ROLE_INFO } from '../catalog';
import { store } from '../store';
import { PHASES, type Role } from '../types';
import { Button, PhaseChip } from '../ui';

export function Onboarding() {
  const [role, setRole] = useState<Role | undefined>();
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '64px 24px' }} className="stack gap-2xl">
      <div className="stack gap-md">
        <div className="overline t-brand">Compass · for BAs, POs & Delivery Managers</div>
        <h1 className="display-xl">From business intent to measurable outcome.</h1>
        <p className="body-lg t-secondary" style={{ maxWidth: 720 }}>
          Tell Compass what the business wants. It asks the right questions, recommends your next best action based on BABOK and real project practice,
          and generates the artefact: analysis, plan, Figma-ready design brief, detailed user stories, rollout plan and usage monitoring.
        </p>
        <div className="rail">{PHASES.map((p) => <PhaseChip key={p} phase={p} />)}</div>
      </div>

      <div className="stack gap-lg">
        <h2 className="h2">What's your role on the team?</h2>
        <p className="t-secondary">Compass tailors suggestions to your role. You can change it any time.</p>
        <div className="grid-3">
          {Object.entries(ROLE_INFO).map(([k, v]) => (
            <button key={k} className="option" aria-pressed={role === k} onClick={() => setRole(k as Role)}>
              <span className="mono t-brand" style={{ minWidth: 56 }}>{k}</span>
              <span className="stack"><span className="h4">{v.name}</span><span className="body-sm t-secondary">{v.desc}</span></span>
            </button>
          ))}
        </div>
      </div>

      <div className="row gap-md wrap">
        <Button variant="accent" disabled={!role} onClick={() => store.setSettings({ role })}>Start using Compass</Button>
        <div className="seg" role="group" aria-label="Language">
          <button aria-pressed={store.get().settings.lang === 'en'} onClick={() => store.setSettings({ lang: 'en' })}>English</button>
          <button aria-pressed={store.get().settings.lang === 'vi'} onClick={() => store.setSettings({ lang: 'vi' })}>Tiếng Việt</button>
        </div>
      </div>

      <div className="grid-3">
        {PHASES.map((p) => (
          <div key={p} className="card stack gap-sm">
            <PhaseChip phase={p} />
            <div className="body-sm t-secondary">{PHASE_INFO[p].goal}</div>
            <div className="mono-sm t-tertiary">{PHASE_INFO[p].babok}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
