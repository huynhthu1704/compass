import { get as idbGet, set as idbSet } from 'idb-keyval';
import { useSyncExternalStore } from 'react';
import type { Product, Profile, Project, Settings, State } from './types';

const KEY = 'compass.v2';
const LEGACY = 'compass.v1';
const DEFAULT: State = { settings: { lang: 'en', theme: 'light', model: 'claude-sonnet-5-5' }, products: [], projects: [] };

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);
export const emptyProfile = (): Profile => ({ summary: '', personas: [], modules: [], kpis: [], constraints: [], glossary: [] });

/** Every initiative must belong to a product. Older data (v1) had stand-alone projects: wrap each in its own product. */
function migrate(s: Partial<State>): State {
  const st: State = { ...DEFAULT, ...s, settings: { ...DEFAULT.settings, ...(s.settings || {}) }, products: s.products || [], projects: s.projects || [] };
  const ids = new Set(st.products.map((p) => p.id));
  const extra: Product[] = [];
  st.projects = st.projects.map((p) => {
    if (p.productId && ids.has(p.productId)) return p;
    const prod: Product = {
      id: uid(), name: p.domain ? `${p.domain} product` : `${p.name} product`, description: '', domain: p.domain, productType: p.productType, stage: p.stage,
      origin: 'scratch', docs: [], profile: emptyProfile(), createdAt: p.createdAt, updatedAt: p.updatedAt,
    };
    extra.push(prod); ids.add(prod.id);
    return { ...p, productId: prod.id };
  });
  st.products = [...st.products, ...extra];
  return st;
}

let state: State = DEFAULT;
let ready = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    idbSet(KEY, state).catch(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
    });
  }, 150);
}

const touch = <T extends { updatedAt: string }>(x: T): T => ({ ...x, updatedAt: new Date().toISOString() });

export const store = {
  async init() {
    if (ready) return;
    let raw: Partial<State> | undefined;
    try { raw = await idbGet(KEY); } catch { /* IndexedDB blocked */ }
    if (!raw) {
      try {
        const ls = localStorage.getItem(KEY) || localStorage.getItem(LEGACY);
        if (ls) raw = JSON.parse(ls);
      } catch { /* ignore */ }
    }
    state = migrate(raw || {});
    ready = true;
    if (raw) emit();
  },
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  setSettings(patch: Partial<Settings>) { state = { ...state, settings: { ...state.settings, ...patch } }; emit(); },

  addProduct(p: Product) { state = { ...state, products: [p, ...state.products] }; emit(); },
  updateProduct(id: string, fn: (p: Product) => Product) { state = { ...state, products: state.products.map((p) => (p.id === id ? touch(fn(p)) : p)) }; emit(); },
  deleteProduct(id: string) { state = { ...state, products: state.products.filter((p) => p.id !== id), projects: state.projects.filter((p) => p.productId !== id) }; emit(); },

  addProject(p: Project) { state = { ...state, projects: [p, ...state.projects] }; emit(); },
  updateProject(id: string, fn: (p: Project) => Project) {
    const proj = state.projects.find((p) => p.id === id);
    state = {
      ...state,
      projects: state.projects.map((p) => (p.id === id ? touch(fn(p)) : p)),
      products: state.products.map((p) => (proj && p.id === proj.productId ? touch(p) : p)),
    };
    emit();
  },
  deleteProject(id: string) { state = { ...state, projects: state.projects.filter((p) => p.id !== id) }; emit(); },
  replaceAll(s: Partial<State>) { state = migrate({ ...state, ...s }); emit(); },
  mergeIn(s: Partial<State>) {
    const prodIds = new Set(state.products.map((p) => p.id));
    const projIds = new Set(state.projects.map((p) => p.id));
    state = migrate({
      ...state,
      products: [...(s.products || []).filter((p) => !prodIds.has(p.id)), ...state.products],
      projects: [...(s.projects || []).filter((p) => !projIds.has(p.id)), ...state.projects],
    });
    emit();
  },
};

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.get);
}
