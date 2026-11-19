import { STAGES, type Project, type Stage } from './types';

export function stageStatus(p: Project): Record<Stage, { done: boolean; note: string }> {
  const s = p.spec;
  const uncovered = s.requirements.filter((r) => !s.tests.some((t) => t.reqIds.includes(r.id)));
  const drafts = s.requirements.filter((r) => r.status === 'Draft');
  const toBuild = s.requirements.filter((r) => r.status === 'Approved');
  const pendingRelease = p.runs.filter((r) => r.agent === 'coder' && r.status === 'approved');
  return {
    idea: { done: !!s.idea.intent && !!s.idea.problem, note: s.idea.intent ? 'Business intent set' : 'No business intent yet' },
    requirements: { done: s.requirements.length > 0 && drafts.length === 0, note: `${s.requirements.length} requirements · ${drafts.length} draft` },
    tests: { done: s.requirements.length > 0 && uncovered.length === 0, note: `${s.tests.length} tests · ${uncovered.length} requirement(s) uncovered` },
    build: { done: s.requirements.length > 0 && toBuild.length === 0, note: `${toBuild.length} approved requirement(s) waiting for code` },
    release: { done: p.releases.length > 0 && pendingRelease.length === 0, note: `${pendingRelease.length} change(s) ready to release · ${p.releases.length} release(s)` },
  };
}

export function currentStage(p: Project): Stage {
  const st = stageStatus(p);
  return STAGES.find((s) => !st[s].done) || 'release';
}
