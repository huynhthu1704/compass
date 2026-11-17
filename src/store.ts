import { useSyncExternalStore } from 'react';
import type { Project, Settings, State } from './types';

const KEY = 'compass.v1';
const DEFAULT: State = { settings: { lang: 'en', theme: 'light', model: 'claude-sonnet-5-5' }, projects: [] };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const s = JSON.parse(raw) as State;
    return { ...DEFAULT, ...s, settings: { ...DEFAULT.settings, ...s.settings } };
  } catch {
    return DEFAULT;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  setSettings(patch: Partial<Settings>) { state = { ...state, settings: { ...state.settings, ...patch } }; emit(); },
  addProject(p: Project) { state = { ...state, projects: [p, ...state.projects] }; emit(); },
  updateProject(id: string, fn: (p: Project) => Project) {
    state = { ...state, projects: state.projects.map((p) => (p.id === id ? { ...fn(p), updatedAt: new Date().toISOString() } : p)) };
    emit();
  },
  deleteProject(id: string) { state = { ...state, projects: state.projects.filter((p) => p.id !== id) }; emit(); },
  replaceAll(s: State) { state = { ...DEFAULT, ...s, settings: { ...DEFAULT.settings, ...s.settings } }; emit(); },
};

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.get);
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);
