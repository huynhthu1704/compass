// F-015 Firestore security rules (REQ-030, REQ-031, REQ-033 … REQ-038) — TC-067.
// The gate-table check always runs. The emulator cases run with `npm run test:rules` (Firestore emulator);
// plain `npm test` skips them when no emulator is running.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GATE_ROLES } from '../src/team.ts';

const RULES = readFileSync(fileURLToPath(new URL('../firestore.rules', import.meta.url)), 'utf8');

test('TC-067 (REQ-033): the gate table in firestore.rules equals GATE_ROLES in src/team.ts', () => {
  const block = RULES.match(/function gateRoles\(\)\s*\{\s*return\s*\{([\s\S]*?)\};/);
  assert.ok(block, 'gateRoles() found in firestore.rules');
  const table = Object.fromEntries([...block[1].matchAll(/'(\w+)':\s*\[([^\]]*)\]/g)].map(([, g, r]) => [g, [...r.matchAll(/'([^']+)'/g)].map((m) => m[1])]));
  assert.deepEqual(table, GATE_ROLES);
});

test('TC-067 (REQ-035): firestore.rules holds only a hash of the super admin email, no plain address', () => {
  assert.match(RULES, /function superAdminHash\(\) \{ return '[0-9a-f]{64}'; \}/);
  assert.doesNotMatch(RULES, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no email address in the rules');
});

const EMU = !!process.env.FIRESTORE_EMULATOR_HOST;
const SA = 'owner@example.com';
const sha = (s) => createHash('sha256').update(s).digest('hex');

test('TC-067: Firestore rules in the emulator', { skip: EMU ? false : 'no Firestore emulator (run npm run test:rules)' }, async (t) => {
  const { initializeTestEnvironment, assertFails, assertSucceeds } = await import('@firebase/rules-unit-testing');
  const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, writeBatch, serverTimestamp } = await import('firebase/firestore');
  const rules = RULES.replace(/superAdminHash\(\) \{ return '[0-9a-f]{64}'/, `superAdminHash() { return '${sha(SA)}'`);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env = await initializeTestEnvironment({ projectId: 'demo-compass', firestore: { rules, host, port: +port } });
  const as = (email, verified = true) => env.authenticatedContext(email, { email, email_verified: verified }).firestore();
  const team = { 'admin@example.com': ['PO', 'Admin'], 'ba@example.com': ['BA', 'QA'] };
  const p1 = { name: 'P1', repo: { owner: 'o', name: 'r' }, members: Object.keys(team), admins: ['admin@example.com'], team };
  const seed = async (withAccess = true) => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      if (withAccess) await setDoc(doc(db, 'config/access'), { superAdmins: [SA] });
      await setDoc(doc(db, 'projects/p1'), p1);
      await setDoc(doc(db, 'projects/p1/baseline/initial'), { approvals: [] });
      await setDoc(doc(db, 'projects/p1/secrets/token'), { token: 'x' });
      await setDoc(doc(db, 'projects/p1/approvals/old'), { items: ['REQ-001'], gate: 'requirements', email: 'ba@example.com', role: 'BA', at: new Date() });
      await setDoc(doc(db, 'projects/p4'), { ...p1, name: 'P4', repo: { owner: 'o', name: 'r4' } }); // a team without a baseline
    });
  };
  const record = (email, gate, role) => ({ items: ['REQ-001'], gate, email, role, at: serverTimestamp() });

  await t.test('refused', async () => {
    await seed();
    const out = as('x@example.com'), ba = as('ba@example.com'), admin = as('admin@example.com'), sa = as(SA);
    await assertFails(getDoc(doc(out, 'projects/p1')));                                   // on no team
    await assertFails(getDoc(doc(out, 'projects/p1/secrets/token')));
    await assertFails(updateDoc(doc(ba, 'projects/p1'), { members: [...p1.members, 'z@example.com'], team: { ...team, 'z@example.com': ['QA'] } })); // not an Admin
    await assertFails(setDoc(doc(ba, 'projects/p1/secrets/token'), { token: 'y' }));
    await assertFails(addDoc(collection(ba, 'projects/p1/approvals'), record('ba@example.com', 'design', 'BA')));   // role does not own the gate
    await assertFails(addDoc(collection(ba, 'projects/p1/approvals'), record('admin@example.com', 'requirements', 'BA'))); // another person's email (role BA is ba's own)
    await assertFails(addDoc(collection(ba, 'projects/p1/approvals'), { ...record('ba@example.com', 'requirements', 'BA'), at: new Date('2026-01-01') })); // a time chosen by the browser
    await assertFails(addDoc(collection(ba, 'projects/p1/approvals'), { ...record('ba@example.com', 'requirements', 'BA'), items: [] }));        // names no item
    await assertFails(addDoc(collection(ba, 'projects/p1/approvals'), record('ba@example.com', 'requirements', 'PO')));    // a role they do not hold
    await assertFails(addDoc(collection(ba, 'projects/p1/approvals'), record('ba@example.com', 'requirements', 'super admin')));
    await assertFails(addDoc(collection(as('ba@example.com', false), 'projects/p1/approvals'), record('ba@example.com', 'requirements', 'BA'))); // unverified
    await assertFails(updateDoc(doc(admin, 'projects/p1/approvals/old'), { role: 'PO' }));                // records are append-only
    await assertFails(deleteDoc(doc(sa, 'projects/p1/approvals/old')));
    await assertFails(updateDoc(doc(admin, 'projects/p1'), { admins: [] }));                              // at least one Admin
    await assertFails(setDoc(doc(sa, 'projects/p1/baseline/initial'), { approvals: [{ x: 1 }] }));         // baseline never changes
    await assertFails(deleteDoc(doc(sa, 'projects/p1/baseline/initial')));
    await assertFails(setDoc(doc(sa, 'projects/p1/baseline/other'), { approvals: [] }));                  // only baseline/initial exists
    await assertFails(setDoc(doc(sa, 'projects/p4/baseline/initial'), { approvals: [] }));                // no baseline for a team that already exists
    await assertFails(getDoc(doc(out, 'config/access')));                                                 // the super admin's email stays private (ADR-013)
    await assertFails(getDoc(doc(ba, 'config/access')));
    // One source of truth for Admin: the `admins` list. 'Admin' in a team role list gives nothing.
    await env.withSecurityRulesDisabled(async (c) => updateDoc(doc(c.firestore(), 'projects/p1'), { team: { ...team, 'ba@example.com': ['BA', 'QA', 'Admin'] } }));
    await assertFails(setDoc(doc(ba, 'projects/p1/secrets/token'), { token: 'y' }));                      // 'Admin' in team, not in admins
    await assertFails(addDoc(collection(ba, 'projects/p1/approvals'), record('ba@example.com', 'team', 'Admin')));
    await assertFails(updateDoc(doc(ba, 'projects/p1'), { admins: ['admin@example.com', 'ba@example.com'] }));
    const noAdmin = writeBatch(sa);                                                                        // a first team must name an Admin
    noAdmin.set(doc(sa, 'projects/p5'), { name: 'P5', repo: { owner: 'o', name: 'r5' }, members: ['a@example.com'], admins: [], team: { 'a@example.com': ['QA'] } });
    noAdmin.set(doc(sa, 'projects/p5/baseline/initial'), { approvals: [] });
    await assertFails(noAdmin.commit());

    await assertFails(updateDoc(doc(sa, 'config/access'), { superAdmins: [SA, 'x@example.com'] }));        // config/access never changes
    const first = writeBatch(admin);                                                                       // first team by a non-super-admin
    first.set(doc(admin, 'projects/p2'), { ...p1, name: 'P2', members: ['admin@example.com'], admins: ['admin@example.com'], team: { 'admin@example.com': ['Admin'] } });
    first.set(doc(admin, 'projects/p2/baseline/initial'), { approvals: [] });
    await assertFails(first.commit());
    await assertFails(setDoc(doc(sa, 'projects/p3'), { ...p1, name: 'P3' }));                              // first team without its baseline
  });

  await t.test('allowed', async () => {
    await seed();
    const ba = as('ba@example.com'), admin = as('admin@example.com'), sa = as(SA);
    await assertSucceeds(getDoc(doc(ba, 'projects/p1')));
    const mixed = as('Ba@Example.com');                                                                    // Google may report a mixed-case email
    await assertSucceeds(getDoc(doc(mixed, 'projects/p1')));
    await assertSucceeds(getDocs(query(collection(mixed, 'projects'), where('members', 'array-contains', 'ba@example.com'))));
    await assertSucceeds(addDoc(collection(mixed, 'projects/p1/approvals'), record('ba@example.com', 'requirements', 'BA')));
    await assertSucceeds(getDoc(doc(sa, 'config/access')));                                                // the super admin reads it
    await assertSucceeds(updateDoc(doc(sa, 'projects/p1'), { members: [...p1.members, 'ux@example.com'], team: { ...team, 'ux@example.com': ['UX'] } })); // super admin manages any team
    await assertSucceeds(setDoc(doc(sa, 'projects/p1/secrets/token'), { token: 'z' }));
    await assertSucceeds(getDoc(doc(ba, 'projects/p1/secrets/token')));                                   // members' browsers read the token (ADR-011)
    await assertSucceeds(getDocs(query(collection(ba, 'projects'), where('members', 'array-contains', 'ba@example.com'))));
    await assertSucceeds(updateDoc(doc(admin, 'projects/p1'), { members: [...p1.members, 'z@example.com'], team: { ...team, 'z@example.com': ['QA'] } }));
    await assertSucceeds(setDoc(doc(admin, 'projects/p1/secrets/token'), { token: 'y' }));
    await assertSucceeds(addDoc(collection(ba, 'projects/p1/approvals'), record('ba@example.com', 'requirements', 'BA')));
    await assertSucceeds(addDoc(collection(ba, 'projects/p1/approvals'), record('ba@example.com', 'tests', 'QA')));
    await assertSucceeds(addDoc(collection(sa, 'projects/p1/approvals'), record(SA, 'design', 'super admin')));
    await assertSucceeds(getDocs(collection(sa, 'projects')));                                             // super admin sees every project
    const first = writeBatch(sa);
    first.set(doc(sa, 'projects/p2'), { name: 'P2', repo: { owner: 'o', name: 'r2' }, members: ['admin@example.com'], admins: ['admin@example.com'], team: { 'admin@example.com': ['Admin'] } });
    first.set(doc(sa, 'projects/p2/baseline/initial'), { approvals: [{ item: 'REQ-001', gate: 'requirements', approvedBy: 'po@example.com (PO)' }] });
    await assertSucceeds(first.commit());
  });

  await t.test('config/access is created once, only by the super admin with a verified email', async () => {
    await seed(false);
    await assertFails(setDoc(doc(as('x@example.com'), 'config/access'), { superAdmins: ['x@example.com'] }));
    await assertFails(setDoc(doc(as(SA, false), 'config/access'), { superAdmins: [SA] }));
    await assertFails(setDoc(doc(as(SA), 'config/access'), { superAdmins: [SA, 'x@example.com'] }));
    await assertSucceeds(setDoc(doc(as(SA), 'config/access'), { superAdmins: [SA] }));
    await assertFails(setDoc(doc(as(SA), 'config/access'), { superAdmins: [SA] }));                       // never changed again
  });

  await env.cleanup();
});
