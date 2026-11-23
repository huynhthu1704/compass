import { featureOf, featureReqs, featureRuns, featureTests } from './spec';
import { STAGES, type Project, type Stage } from './types';

export type FeatureStage = Stage | 'done';

/** Status of each pipeline stage for ONE feature. */
export function stageStatus(p: Project, fid: string): Record<Stage, { done: boolean; note: string }> {
  const f = featureOf(p, fid);
  const reqs = featureReqs(p, fid);
  const tests = featureTests(p, fid);
  const uncovered = reqs.filter((r) => !tests.some((t) => t.reqIds.includes(r.id)));
  const drafts = reqs.filter((r) => r.status === 'Draft');
  const toBuild = reqs.filter((r) => r.status === 'Approved');
  const pending = featureRuns(p, fid).filter((r) => r.agent === 'coder' && r.status === 'approved');
  const done = reqs.filter((r) => r.status === 'Done');
  return {
    idea: { done: !!f?.idea.intent && !!f?.idea.problem, note: f?.idea.intent ? 'Intent set' : 'No intent yet' },
    requirements: { done: reqs.length > 0 && drafts.length === 0, note: `${reqs.length} REQ · ${drafts.length} draft` },
    tests: { done: reqs.length > 0 && uncovered.length === 0, note: `${tests.length} TC · ${uncovered.length} uncovered` },
    build: { done: reqs.length > 0 && toBuild.length === 0, note: `${toBuild.length} waiting for code · ${pending.length} PR` },
    release: { done: reqs.length > 0 && done.length === reqs.length, note: `${done.length}/${reqs.length} REQ released` },
  };
}

/** The stage a feature is in ('done' when everything is released). */
export function featureStage(p: Project, fid: string): FeatureStage {
  const st = stageStatus(p, fid);
  return STAGES.find((s) => !st[s].done) || 'done';
}

export const activeFeatures = (p: Project) => p.spec.features.filter((f) => !f.archived);
