import { get as idbGet, set as idbSet } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import type { Project, Settings, Spec, State } from './types';

const KEY = 'compass.v3';
const DEFAULT: State = { settings: { lang: 'vi', theme: 'light', model: 'claude-sonnet-5-5', requireApproval: true }, projects: [] };

export const uid = () => Math.random().toString(36).slice(2, 10);
export const now = () => new Date().toISOString();

export const emptySpec = (): Spec => ({
  version: 1,
  idea: { intent: '', problem: '', users: [], outcomeMetric: '', scopeIn: [], scopeOut: [], risks: [], stack: 'React + TypeScript + Vite, deployed to GitHub Pages' },
  requirements: [], tests: [], decisions: [],
});

let state: State = DEFAULT;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
  clearTimeout(timer);
  timer = setTimeout(() => { idbSet(KEY, state).catch(() => { /* storage unavailable */ }); }, 150);
}

export const store = {
  async init() {
    try {
      const raw = (await idbGet(KEY)) as State | undefined;
      if (raw) state = { ...DEFAULT, ...raw, settings: { ...DEFAULT.settings, ...raw.settings } };
    } catch { /* IndexedDB blocked: keep defaults */ }
  },
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  setSettings(patch: Partial<Settings>) { state = { ...state, settings: { ...state.settings, ...patch } }; emit(); },
  addProject(p: Project) { state = { ...state, projects: [p, ...state.projects.filter((x) => x.id !== p.id)] }; emit(); },
  update(id: string, fn: (p: Project) => Project) {
    state = { ...state, projects: state.projects.map((p) => (p.id === id ? { ...fn(p), updatedAt: now() } : p)) };
    emit();
  },
  /** Edit the spec; marks the project dirty so the UI offers "Commit spec to GitHub". */
  spec(id: string, fn: (s: Spec) => Spec) { store.update(id, (p) => ({ ...p, spec: fn(p.spec), dirty: true })); },
  remove(id: string) { state = { ...state, projects: state.projects.filter((p) => p.id !== id) }; emit(); },
  replaceAll(s: Partial<State>) { state = { ...DEFAULT, ...s, settings: { ...DEFAULT.settings, ...(s.settings || {}) }, projects: s.projects || [] }; emit(); },
};

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.get);
}

export function newProject(partial: Partial<Project>): Project {
  return { id: uid(), name: 'Untitled', description: '', repo: null, frameworkInstalled: false, spec: emptySpec(), dirty: false, runs: [], releases: [], createdAt: now(), updatedAt: now(), ...partial };
}

export const nextId = (prefix: 'REQ' | 'TC' | 'ADR', ids: string[]) => {
  const n = ids.map((x) => +x.replace(/\D/g, '') || 0);
  return `${prefix}-${String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0')}`;
};
