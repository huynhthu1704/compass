/** Spec helpers: v1 → v2 migration (single idea → features) and feature-scoped views. */
import type { Feature, Idea, Project, Requirement, Spec, TestCase } from './types';

export const emptyIdea = (): Idea => ({ intent: '', problem: '', users: [], outcomeMetric: '', scopeIn: [], scopeOut: [], risks: [] });
export const DEFAULT_STACK = 'Static web app (HTML/JS ES modules), node:test, GitHub Pages';

export const featureName = (intent: string) => {
  const w = intent.trim().replace(/[.!?]$/, '').split(/\s+/);
  return w.length ? w.slice(0, 7).join(' ') + (w.length > 7 ? '…' : '') : 'New feature';
};

export function nextFeatureId(features: Feature[]) {
  const n = features.map((f) => +f.id.replace(/\D/g, '') || 0);
  return `F-${String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0')}`;
}

/** Accepts any stored/pulled spec (v1 or v2) and returns a valid v2 spec. */
export function migrateSpec(raw: Partial<Spec> & { idea?: Idea }): Spec {
  const s = raw as Spec;
  const requirements: Requirement[] = s.requirements || [];
  const tests: TestCase[] = s.tests || [];
  let features: Feature[] = s.features || [];
  const stack = s.stack || s.idea?.stack || DEFAULT_STACK;
  if (!features.length && (s.idea?.intent || requirements.length)) {
    const idea = { ...emptyIdea(), ...(s.idea || {}) };
    delete idea.stack;
    features = [{ id: 'F-001', name: featureName(idea.intent || 'First feature'), idea, createdAt: new Date().toISOString() }];
  }
  const first = features[0]?.id;
  return {
    version: 2, stack, features,
    requirements: requirements.map((r) => (r.featureId || !first ? r : { ...r, featureId: first })),
    tests, decisions: s.decisions || [],
    ...(s.designTool ? { designTool: s.designTool } : {}),
  };
}

export function migrateProject(p: Project): Project {
  const spec = migrateSpec(p.spec);
  const first = spec.features[0]?.id;
  return { ...p, spec, runs: (p.runs || []).map((r) => (r.featureId || !first ? r : { ...r, featureId: first })) };
}

export const featureOf = (p: Project, fid?: string) => p.spec.features.find((f) => f.id === fid);
export const featureReqs = (p: Project, fid: string) => p.spec.requirements.filter((r) => r.featureId === fid);
export const featureTests = (p: Project, fid: string) => { const ids = new Set(featureReqs(p, fid).map((r) => r.id)); return p.spec.tests.filter((t) => t.reqIds.some((id) => ids.has(id))); };
export const featureRuns = (p: Project, fid: string) => p.runs.filter((r) => r.featureId === fid);
