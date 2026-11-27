// F-013 Sidebar navigation (REQ-070 … REQ-073) — what the sidebar shows, as plain data.
// Types-only imports, so Node runs this file directly in tests/sidebar.test.mjs.
import type { Feature, Run, Stage } from './types.ts';

export type IconName = 'projects' | 'architecture' | 'board' | 'floor' | 'runs' | 'release';
export type NavLink = { key: string; label: string; path: string; icon: IconName; title?: string; count?: ApprovalCount };
export type ApprovalCount = { n: number; label: string; title: string };
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** REQ-070: the workspace group. */
export const WORKSPACE_LINKS: NavLink[] = [
  { key: 'projects', label: 'Projects', path: '/', icon: 'projects' },
  { key: 'architecture', label: 'Agent architecture', path: '/architecture', icon: 'architecture' },
];

/** REQ-071: one count of the runs waiting for approval, or null when there are none. */
export function approvalCount(runs: Pick<Run, 'status'>[]): ApprovalCount | null {
  const n = runs.filter((r) => r.status === 'awaiting-approval').length;
  return n ? { n, label: `${n} waiting for approval`, title: `${n} agent run${n === 1 ? '' : 's'} waiting for your approval` } : null;
}

/** REQ-070 / REQ-071: the project group, in order; only Team floor carries the approval count.
 *  REQ-075: no Knowledge link for any role — the page stays reachable at `/p/<id>/knowledge`. */
export function projectLinks(projectId: string, runs: Pick<Run, 'status'>[]): NavLink[] {
  const base = `/p/${projectId}`;
  const count = approvalCount(runs) || undefined;
  return [
    { key: '', label: 'Feature board', path: base, icon: 'board' },
    { key: 'floor', label: 'Team floor', path: `${base}/floor`, icon: 'floor', count, title: count?.title },
    { key: 'runs', label: 'Agent runs', path: `${base}/runs`, icon: 'runs' },
    { key: 'release', label: 'Release', path: `${base}/release`, icon: 'release' },
  ];
}

/** REQ-070: the state line of the project card. `sync` is the GitHub sync label, or null when nothing syncs (no repo, or no token). */
export function projectState(p: { demo?: boolean; repo?: unknown }, sync: { tone: Tone; text: string } | null): { text: string; tone: Tone } {
  if (p.demo) return { text: 'Demo project', tone: 'neutral' };
  if (sync && sync.text) return { text: sync.text, tone: sync.tone };
  return p.repo ? { text: 'On GitHub · connect to sync', tone: 'warning' } : { text: 'Local project', tone: 'neutral' };
}

export type FeatureRow = { id: string; short: string; name: string; stage: Stage | 'done'; title: string };

/** REQ-072: the feature rows — archived features are hidden unless open; the heading count is rows.length. */
export function featureRows(features: Feature[], openId: string | undefined, stageOf: (id: string) => Stage | 'done', stageName: (s: Stage | 'done') => string): FeatureRow[] {
  return features.filter((f) => !f.archived || f.id === openId).map((f) => {
    const stage = stageOf(f.id);
    return { id: f.id, short: f.id.replace('F-0', 'F'), name: f.name, stage, title: `${f.id} · ${f.name} — ${stageName(stage)}` };
  });
}

/** REQ-073: the account card at the bottom. */
export function accountCard(githubUser?: string): { initial: string; name: string; state: string; tone: Tone } {
  return githubUser
    ? { initial: githubUser.slice(0, 1).toUpperCase(), name: `@${githubUser}`, state: 'GitHub connected', tone: 'success' }
    : { initial: '?', name: 'Not connected', state: 'Demo mode · connect', tone: 'warning' };
}

/** REQ-073: the one theme button switches to the other theme. */
export function themeToggle(theme: 'light' | 'dark'): { next: 'light' | 'dark'; label: string; icon: 'sun' | 'moon' } {
  const next = theme === 'dark' ? 'light' : 'dark';
  return { next, label: `Switch to ${next} theme`, icon: next === 'dark' ? 'moon' : 'sun' };
}
