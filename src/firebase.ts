// F-015 Team access — Google sign-in and team data in Firestore (REQ-032, REQ-035; ADR-010, ADR-013).
// Off unless the build has VITE_FIREBASE_CONFIG (the deploy workflow passes the FIREBASE_CONFIG repository variable).
// Without it the portal works exactly as before (REQ-032 AC5). The firebase library is only loaded when it is on.
import { useSyncExternalStore } from 'react';
import { accessFor, applyTeamOp, membersFromDoc, normalizeEmail, teamDoc, type BaselineApproval, type Member, type TeamDoc, type TeamOp, type TeamResult, type TeamRole } from './team';
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
    const authApp = auth.getAuth(a), db = fs.getFirestore(a);
    // Local testing only (npm run dev with VITE_FIREBASE_EMULATORS=1): use the Auth and Firestore emulators.
    if (import.meta.env?.DEV && import.meta.env?.VITE_FIREBASE_EMULATORS) {
      auth.connectAuthEmulator(authApp, 'http://127.0.0.1:9099', { disableWarnings: true });
      fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
      // Test hook: the emulator accepts an unsigned Google credential, so UI tests can sign in without Google's popup
      // script (apis.google.com). Only exists in local dev builds with the emulators; never in the live build.
      (window as unknown as Record<string, unknown>).__compassTestSignIn = (email: string) =>
        auth.signInWithCredential(authApp, auth.GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })));
    }
    return { auth, fs, authApp, db };
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
      if (!user) { clearProjectTokens(); set({ status: 'signed-out', email: undefined, superAdmin: false, access: [], error: undefined }); return; }
      if (session.email && normalizeEmail(user.email || '') !== session.email) clearProjectTokens(); // another account in this tab
      void loadAccess(user.email || '', user.emailVerified);
    });
  } catch (e) { set({ status: 'signed-out', error: (e as Error).message }); }
}

/** Reads config/access (creating it at the super admin's first sign-in, ADR-013) and the person's projects. */
async function loadAccess(rawEmail: string, verified: boolean) {
  const email = normalizeEmail(rawEmail);
  if (!verified) { set({ status: 'signed-in', email, superAdmin: false, access: [] }); return; }
  // A refresh (after a team save or Reload) keeps the current screen; only the first load shows "Loading…".
  if (session.status !== 'signed-in' || session.email !== email) set({ status: 'loading', email });
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
      return { id: d.id, team: membersFromDoc(d.data() as Partial<TeamDoc>) };
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

// ---- Team page (SCR-3) ------------------------------------------------------------------------------------------------

/** The project's team, or null when it has no team yet. */
export async function loadTeam(key: string): Promise<{ name: string; members: Member[] } | null> {
  const { fs, db } = await load();
  const snap = await fs.getDoc(fs.doc(db, 'projects', key));
  if (!snap.exists()) return null;
  const d = snap.data() as TeamDoc;
  return { name: d.name, members: membersFromDoc(d) };
}

/** Applies one change to the team as it is in the database right now, in a transaction, so a tab that loaded the team
 *  earlier cannot undo another Admin's change (e.g. bring back a removed person). The first change creates the team
 *  together with its approval baseline (REQ-038 AC1; super admin only, enforced by the rules). */
export async function changeTeam(key: string, project: { name: string; repo: { owner: string; name: string } }, op: TeamOp, baseline: () => BaselineApproval[]): Promise<TeamResult & { created?: boolean }> {
  const { fs, db } = await load();
  const ref = fs.doc(db, 'projects', key);
  const result = await fs.runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? membersFromDoc(snap.data() as TeamDoc) : [];
    const r = applyTeamOp(current, op, !snap.exists());
    if (!r.ok) return r;
    tx.set(ref, teamDoc(project.name, project.repo, r.team));
    if (!snap.exists()) tx.set(fs.doc(db, 'projects', key, 'baseline', 'initial'), { approvals: baseline() });
    return { ...r, created: !snap.exists() };
  });
  if (result.ok) await reloadAccess();
  return result;
}

// ---- Project GitHub token (REQ-034, ADR-011) -------------------------------------------------------------------------

const tokens = new Map<string, string | null>();
const tokenListeners = new Set<() => void>();
const tokenChanged = () => tokenListeners.forEach((l) => l());

/** The cached project token: a string, null when the project has none, undefined when not loaded yet. */
export const projectTokenOf = (key: string) => tokens.get(key);
/** Forget every cached project token (sign-out, or another account signs in in this tab). */
export function clearProjectTokens() { if (tokens.size) { tokens.clear(); tokenChanged(); } }
/** Called whenever a project token is loaded, replaced or forgotten (autosync re-checks dirty projects). */
export function onProjectTokenChange(l: () => void) { tokenListeners.add(l); return () => { tokenListeners.delete(l); }; }
export const useProjectToken = (key: string) => useSyncExternalStore((l) => { tokenListeners.add(l); return () => tokenListeners.delete(l); }, () => tokens.get(key));

/** Loads the project token (members and the super admin may read it). */
export async function loadProjectToken(key: string) {
  const { fs, db } = await load();
  try {
    const snap = await fs.getDoc(fs.doc(db, 'projects', key, 'secrets', 'token'));
    tokens.set(key, snap.exists() ? String(snap.data().token || '') || null : null);
  } catch (e) { tokens.delete(key); tokenChanged(); throw e; } // refused (e.g. removed from the team): forget it
  tokenChanged();
}

/** Saves the project token (Admins of the project or the super admin; the rules refuse anyone else). */
export async function saveProjectToken(key: string, token: string) {
  const { fs, db } = await load();
  await fs.setDoc(fs.doc(db, 'projects', key, 'secrets', 'token'), { token });
  tokens.set(key, token);
  tokenChanged();
}
