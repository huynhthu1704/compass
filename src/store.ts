import { get as idbGet, set as idbSet } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import { DEFAULT_STACK, migrateProject } from './spec';
import { keepOneDemo, withDemoDesignFiles } from './demoOnce';
import type { Project, Settings, Spec, State } from './types';

const KEY = 'compass.v3';
const DEFAULT: State = { settings: { lang: 'vi', theme: 'light', model: 'claude-sonnet-5-5', requireApproval: true, autoSync: true }, projects: [] };

export const uid = () => Math.random().toString(36).slice(2, 10);
export const now = () => new Date().toISOString();

export const emptySpec = (): Spec => ({ version: 2, stack: DEFAULT_STACK, features: [], requirements: [], tests: [], decisions: [] });

let state: State = DEFAULT;
// F-015 REQ-041: settings that replace the device's own while signed in (shared key, model, auto-sync; ADR-017).
// Never saved to the device. `view` is what the app reads; `state` is what is stored.
let override: Partial<Settings> | null = null;
let view: State = state;
const refresh = () => { view = override ? { ...state, settings: { ...state.settings, ...override } } : state; };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  refresh();
  listeners.forEach((l) => l());
  clearTimeout(timer);
  timer = setTimeout(() => { idbSet(KEY, state).catch(() => { /* storage unavailable */ }); }, 150);
}

export const store = {
  async init() {
    try {
      const raw = (await idbGet(KEY)) as State | undefined;
      if (raw) state = { ...DEFAULT, ...raw, settings: { ...DEFAULT.settings, ...raw.settings }, projects: keepOneDemo((raw.projects || []).map(migrateProject).map(withDemoDesignFiles)) }; // drop duplicate demo copies (REQ-109)
    } catch { /* IndexedDB blocked: keep defaults */ }
    refresh();
  },
  /** The state with the signed-in override applied (what every page and agent uses). */
  get: () => view,
  /** The device's own state, without the override (Connections: the creator token saved on this device). */
  raw: () => state,
  /** Sets or clears the override (firebase.ts, on every session or workspace change). Never saved. */
  setOverride(o: Partial<Settings> | null) {
    if (JSON.stringify(o) === JSON.stringify(override)) return;
    override = o; refresh(); listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  setSettings(patch: Partial<Settings>) { state = { ...state, settings: { ...state.settings, ...patch } }; emit(); },
  addProject(p: Project) { const m = migrateProject(p); state = { ...state, projects: [m, ...state.projects.filter((x) => x.id !== m.id)] }; emit(); },
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
