import { useState } from 'react';
import { store } from '../store';
import type { Role } from '../types';
import { STAGES } from '../types';
import { Button, StageChip } from '../ui';

const ROLES: [Role, string, string][] = [
  ['PO', 'Product Owner', 'Ideas, priorities, approvals, releases'],
  ['BA', 'Business Analyst', 'Requirements and acceptance criteria'],
  ['DM', 'Delivery Manager', 'Flow, PRs, CI and releases'],
  ['UX', 'Designer', 'Flows and UI requirements'],
  ['Dev', 'Developer', 'Code, reviews, agent changes'],
  ['QA', 'QA / Tester', 'Test cases and quality gates'],
  ['Ops', 'Ops', 'Deploys, environments, guardrails'],
];

export function Onboarding() {
  const [role, setRole] = useState<Role | undefined>();
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '64px 24px' }} className="stack gap-2xl">
      <div className="stack gap-md">
        <div className="overline t-brand">Compass · AI dev portal</div>
        <h1 className="display-xl">From idea to released website — with agents you can trust.</h1>
        <p className="body-lg t-secondary" style={{ maxWidth: 760 }}>
          Compass manages your GitHub projects end to end: shape the idea, write requirements and test cases, let a coding agent open pull requests, and release in one click.
          Every repo gets the <strong>Compass Framework</strong>, so anyone — in any role, human or AI — can pick it up and continue.
        </p>
        <div className="rail">{STAGES.map((s) => <StageChip key={s} stage={s} />)}</div>
      </div>
      <div className="stack gap-lg">
        <h2 className="h2">What's your role?</h2>
        <div className="grid-3">
          {ROLES.map(([k, n, d]) => (
            <button key={k} className="option" aria-pressed={role === k} onClick={() => setRole(k)}>
              <span className="mono t-brand" style={{ minWidth: 40 }}>{k}</span>
              <span className="stack"><span className="h4">{n}</span><span className="body-sm t-secondary">{d}</span></span>
            </button>
          ))}
        </div>
      </div>
      <div><Button variant="accent" disabled={!role} onClick={() => { store.setSettings({ role }); window.location.hash = '/connect?welcome=1'; }}>Continue</Button></div>
    </div>
  );
}
