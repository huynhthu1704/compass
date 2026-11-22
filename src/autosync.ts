/**
 * Auto-sync: commits spec changes (compass/spec.json + generated docs) to the repo's default branch
 * a few seconds after the user stops editing — no "Commit spec" click needed.
 * Only runs once compass/spec.json exists on the default branch (i.e. the framework PR is merged).
 */
import { useSyncExternalStore } from 'react';
import { github } from './github';
import { commitSpec } from './harness';
import { store } from './store';

export type SyncState = { status: 'idle' | 'pending' | 'saving' | 'saved' | 'waiting-framework' | 'error'; at?: string; message?: string };

const DELAY = 6000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const states = new Map<string, SyncState>();
const ready = new Set<string>();          // projects whose default branch has compass/spec.json
const listeners = new Set<() => void>();
let snapshot = new Map(states);
const emit = () => { snapshot = new Map(states); listeners.forEach((l) => l()); };
const set = (id: string, s: SyncState) => { states.set(id, s); emit(); };

async function sync(id: string) {
  const p = store.get().projects.find((x) => x.id === id);
  const { githubToken: token, autoSync } = store.get().settings;
  if (!p || !p.dirty || !p.repo || p.demo || !token || !autoSync) return;
  try {
    if (!ready.has(id)) {
      const f = await github.file(token, p.repo, 'compass/spec.json');
      if (!f) { set(id, { status: 'waiting-framework', message: 'Merge the "Install Compass Framework" PR first — then changes sync automatically.' }); return; }
      ready.add(id);
    }
    set(id, { status: 'saving' });
    await commitSpec(id);
    set(id, { status: 'saved', at: new Date().toISOString() });
    if (store.get().projects.find((x) => x.id === id)?.dirty) schedule(id); // edited during the commit
  } catch (e) {
    set(id, { status: 'error', message: (e as Error).message });
  }
}

function schedule(id: string) {
  clearTimeout(timers.get(id));
  set(id, { status: 'pending' });
  timers.set(id, setTimeout(() => sync(id), DELAY));
}

let last = new Map<string, string>();
export function startAutoSync() {
  const check = () => {
    const { githubToken, autoSync } = store.get().settings;
    const next = new Map<string, string>();
    for (const p of store.get().projects) {
      const sig = JSON.stringify(p.spec);
      next.set(p.id, sig);
      if (!autoSync || !githubToken || !p.repo || p.demo || !p.dirty) continue;
      if (last.get(p.id) !== sig) schedule(p.id);
    }
    last = next;
  };
  store.subscribe(check);
  check();
  // retry pending/waiting projects every minute (e.g. after the framework PR is merged)
  setInterval(() => {
    for (const [id, s] of states) if ((s.status === 'waiting-framework' || s.status === 'error') && store.get().projects.find((x) => x.id === id)?.dirty) sync(id);
  }, 60_000);
}

export const syncNow = (id: string) => { clearTimeout(timers.get(id)); return sync(id); };
export function useSync(id: string | undefined): SyncState | undefined {
  const m = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot);
  return id ? m.get(id) : undefined;
}

export function syncLabel(s: SyncState | undefined, dirty: boolean): { tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; text: string } {
  if (!s) return dirty ? { tone: 'warning', text: 'Changes not synced' } : { tone: 'success', text: 'Synced with GitHub' };
  switch (s.status) {
    case 'pending': return { tone: 'info', text: 'Saving to GitHub in a few seconds…' };
    case 'saving': return { tone: 'info', text: 'Committing to GitHub…' };
    case 'saved': return { tone: 'success', text: `Synced with GitHub${s.at ? ' · ' + new Date(s.at).toLocaleTimeString() : ''}` };
    case 'waiting-framework': return { tone: 'warning', text: 'Waiting for framework PR to be merged' };
    case 'error': return { tone: 'danger', text: 'Sync failed' };
    default: return { tone: 'neutral', text: '' };
  }
}
