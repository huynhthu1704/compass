import { byId } from './catalog';
import { GENERATORS, generateStories, sampleMetrics } from './generators';
import { uid } from './store';
import type { Project } from './types';

export function newProject(partial: Partial<Project>): Project {
  const now = new Date().toISOString();
  return {
    id: uid(), name: 'Untitled project', intent: '', domain: '', productType: 'B2C', stage: 'Existing product', size: 'medium',
    features: [], answers: {}, artefacts: [], stories: [], changelog: [], metrics: [], alertThreshold: 15, skipped: [], checklist: {},
    createdAt: now, updatedAt: now, ...partial,
  };
}

export function sampleProject(): Project {
  const p = newProject({
    name: 'Checkout drop-off',
    intent: 'Reduce checkout drop-off on the mobile web shop by 20% this quarter',
    domain: 'E-commerce (fashion retail)',
    productType: 'B2C',
    stage: 'Existing product',
    size: 'medium',
    features: ['Guest checkout without account', 'Saved addresses and one-tap payment', 'Clear delivery fee before payment'],
    answers: {
      affected: 'Mobile shoppers, Customer service agents, Payment operations',
      pain: '68% of mobile users who reach checkout leave before paying; top complaints: forced registration and surprise delivery fees',
      metric: 'Checkout completion rate on mobile (baseline 32%, target 38%)',
      constraints: 'Must go live before the 12.12 sale; PCI-DSS for payments; no new payment provider this quarter',
      tried: 'Shortened the address form last year — small improvement only',
    },
  });
  return p;
}

export function withSampleData(base: Project): Project {
  const now = new Date().toISOString();
  let p: Project = { ...base, stories: generateStories(base) };
  const ids = ['problem-statement', 'stakeholder-map', 'success-metrics', 'scope', 'requirements', 'tracking-plan', 'ux-brief', 'release-plan'];
  for (const id of ids) {
    const a = byId(id);
    p = { ...p, artefacts: [...p.artefacts, { id: uid(), actionId: id, title: a.title, phase: a.phase, content: GENERATORS[id](p), status: id === 'release-plan' || id === 'ux-brief' ? 'draft' : 'approved', createdAt: now, updatedAt: now, version: 1 }] };
  }
  p.stories = p.stories.map((s, i) => ({ ...s, status: i < 4 ? 'Done' : i < 6 ? 'In progress' : 'To do' }));
  const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  return {
    ...p,
    metrics: sampleMetrics(p),
    changelog: [
      { id: uid(), date: d(24), title: 'Guest checkout released to 5% pilot', type: 'release', rollout: 5 },
      { id: uid(), date: d(17), title: 'Rollout increased to 50%', type: 'change', rollout: 50 },
      { id: uid(), date: d(7), title: 'New delivery-fee banner (A/B test)', type: 'experiment', rollout: 50 },
    ],
  };
}
