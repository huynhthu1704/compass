// F-015 Team access — Google sign-in and team data in Firestore (REQ-032, REQ-035; ADR-010, ADR-013).
// Off unless the build has VITE_FIREBASE_CONFIG (the deploy workflow passes the FIREBASE_CONFIG repository variable).
// Without it the portal works exactly as before (REQ-032 AC5). The firebase library is only loaded when it is on.
import { useSyncExternalStore } from 'react';
import { accessFor, normalizeEmail, type Member, type TeamRole } from './team';
import type { RepoRef } from './types';

export interface FirebaseWebConfig { apiKey: string; authDomain: string; projectId: string; appId: string; [k: string]: string }

/** Parses the JSON web config; returns null when it is missing or incomplete (sign-in stays off). */
export function readConfig(raw: string | undefined): FirebaseWebConfig | null {
  if (!raw || !raw.trim()) return null;
  try {
    const c = JSON.parse(raw) as Partial<FirebaseWebConfig>;
    return c && typeof c === 'object' && c.apiKey && c.authDomain && c.projectId && c.appId ? (c as FirebaseWebConfig) : null;
  } catch { return null; }
}

const CONFIG = readConfig(import.meta.env?.VITE_FIREBASE_CONFIG as string | undefined);
export const firebaseEnabled = !!CONFIG;

/** Firestore document id of a project: its GitHub repo, e.g. "huynhthu1704__compass". */
export const projectKey = (repo: Pick<RepoRef, 'owner' | 'name'>) => `${repo.owner}__${repo.name}`.toLowerCase();

export interface ProjectAccess { id: string; roles: TeamRole[] }
export interface Session {
  status: 'off' | 'loading' | 'signed-out' | 'signed-in';
  email?: string;
  superAdmin: boolean;
  access: ProjectAccess[];
  error?: string;
}

let session: Session = { status: firebaseEnabled ? 'loading' : 'off', superAdmin: false, access: [] };
const listeners = new Set<() => void>();
const set = (patch: Partial<Session>) => { session = { ...session, ...patch }; listeners.forEach((l) => l()); };
export const useSession = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => session);
export const getSession = () => session;

type Fb = { auth: typeof import('firebase/auth'); fs: typeof import('firebase/firestore'); authApp: import('firebase/auth').Auth; db: import('firebase/firestore').Firestore };
let fb: Promise<Fb> | null = null;
function load(): Promise<Fb> {
  if (!CONFIG) return Promise.reject(new Error('Firebase is not configured'));
  fb ||= (async () => {
    const [app, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const a = app.initializeApp(CONFIG);
    return { auth, fs, authApp: auth.getAuth(a), db: fs.getFirestore(a) };
  })();
  return fb;
}

/** May the signed-in person see this local project? Always true when sign-in is off; the super admin sees all. */
export function canSeeProject(p: { repo: Pick<RepoRef, 'owner' | 'name'> | null }, s: Session = session) {
  if (s.status === 'off' || s.superAdmin) return true;
  return !!p.repo && s.access.some((a) => a.id === projectKey(p.repo!));
}

/** Starts listening to the sign-in state; call once at start-up. */
export async function startSession() {
  if (!CONFIG) return;
  try {
    const { auth, authApp } = await load();
    currentAuth = authApp;
    auth.onAuthStateChanged(authApp, (user) => {
      if (!user) { set({ status: 'signed-out', email: undefined, superAdmin: false, access: [], error: undefined }); return; }
      void loadAccess(user.email || '', user.emailVerified);
    });
  } catch (e) { set({ status: 'signed-out', error: (e as Error).message }); }
}

/** Reads config/access (creating it at the super admin's first sign-in, ADR-013) and the person's projects. */
async function loadAccess(rawEmail: string, verified: boolean) {
  const email = normalizeEmail(rawEmail);
  if (!verified) { set({ status: 'signed-in', email, superAdmin: false, access: [] }); return; }
  set({ status: 'loading', email });
  try {
    const { fs, db } = await load();
    const accessRef = fs.doc(db, 'config', 'access');
    // Only a super admin can read config/access; for anyone else (or when it does not exist yet) the read is refused.
    const readAccess = async () => { try { const s = await fs.getDoc(accessRef); return s.exists() ? (s.data().superAdmins as string[] || []) : null; } catch { return null; } };
    let superAdmins = await readAccess();
    if (!superAdmins) {
      // Created once, by the account whose hashed email is in firestore.rules (ADR-013); anyone else is refused, silently.
      try { await fs.setDoc(accessRef, { superAdmins: [email] }); superAdmins = await readAccess(); } catch { /* not the super admin, or it exists */ }
    }
    superAdmins ||= [];
    const viewer = { email, emailVerified: true };
    const superAdmin = superAdmins.map(normalizeEmail).includes(email);
    const q = superAdmin ? fs.collection(db, 'projects') : fs.query(fs.collection(db, 'projects'), fs.where('members', 'array-contains', email));
    const docs = (await fs.getDocs(q)).docs.map((d) => {
      // Admin comes only from `admins` (one source of truth, as in firestore.rules); 'Admin' in a role list is ignored.
      const team = (d.data().team || {}) as Record<string, TeamRole[]>;
      const admins = ((d.data().admins || []) as string[]).map(normalizeEmail);
      return { id: d.id, team: Object.entries(team).map(([e, roles]): Member => ({ email: e, roles: [...roles.filter((r) => r !== 'Admin'), ...(admins.includes(normalizeEmail(e)) ? ['Admin' as const] : [])] })) };
    });
    if (!stillSignedIn(email)) return; // signed out (or switched account) while loading
    set({ status: 'signed-in', email, superAdmin, access: accessFor(docs, viewer, superAdmins), error: undefined });
  } catch (e) {
    if (stillSignedIn(email)) set({ status: 'signed-in', email, superAdmin: false, access: [], error: `Could not load your projects: ${(e as Error).message}` });
  }
}

/** True while the same account is still signed in (guards against a load finishing after sign-out). */
function stillSignedIn(email: string) {
  return !!currentAuth && normalizeEmail(currentAuth.currentUser?.email || '') === email;
}
let currentAuth: import('firebase/auth').Auth | null = null;

export async function signInWithGoogle() {
  const { auth, authApp } = await load();
  await auth.signInWithPopup(authApp, new auth.GoogleAuthProvider());
}

export async function signOut() {
  const { auth, authApp } = await load();
  await auth.signOut(authApp);
}

/** Reload the person's projects, e.g. after their admin added them (SCR-2 "Reload"). */
export async function reloadAccess() {
  const { authApp } = await load();
  const u = authApp.currentUser;
  if (u) await loadAccess(u.email || '', u.emailVerified);
}
