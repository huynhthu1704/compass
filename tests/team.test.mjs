// F-015 Team access (REQ-030 … REQ-036) — TC-060 … TC-064, TC-066, TC-071.
// src/team.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAST_ADMIN, accessFor, addMember, approvedBy, canPass, gateHint, isSuperAdmin, removeMember, setRoles } from '../src/team.ts';

test('TC-060 (REQ-030): adding a person normalises the email and keeps several roles', () => {
  const r = addMember([], 'Ba@Example.com ', ['QA', 'BA']);
  assert.equal(r.ok, true);
  assert.deepEqual(r.team, [{ email: 'ba@example.com', roles: ['BA', 'QA'] }]);
});

test('TC-061 (REQ-030): adding is refused for a bad email, no role or a duplicate', () => {
  const team = [{ email: 'ba@example.com', roles: ['BA'] }];
  for (const [email, roles, msg] of [['not-an-email', ['BA'], /not a valid email/], ['dev@example.com', [], /at least one role/], ['BA@example.com', ['QA'], /already on the team/]]) {
    const r = addMember(team, email, roles);
    assert.equal(r.ok, false, email);
    assert.match(r.error, msg);
    assert.equal(r.team, team, 'team unchanged');
  }
  assert.deepEqual(team, [{ email: 'ba@example.com', roles: ['BA'] }], 'input not mutated');
});

test('TC-062 (REQ-031): the last Admin cannot be removed or lose the Admin role', () => {
  const one = [{ email: 'po@example.com', roles: ['PO', 'Admin'] }, { email: 'ba@example.com', roles: ['BA'] }];
  assert.deepEqual(removeMember(one, 'po@example.com'), { ok: false, team: one, error: LAST_ADMIN });
  assert.deepEqual(setRoles(one, 'PO@example.com', ['PO']), { ok: false, team: one, error: LAST_ADMIN });
  const two = [...one, { email: 'dm@example.com', roles: ['DM', 'Admin'] }];
  assert.equal(removeMember(two, 'po@example.com').ok, true);
  assert.deepEqual(setRoles(two, 'po@example.com', ['PO']).team[0], { email: 'po@example.com', roles: ['PO'] });
});

test('TC-063 (REQ-031): changing roles and removing a person update the team', () => {
  const team = [{ email: 'po@example.com', roles: ['Admin'] }, { email: 'ba@example.com', roles: ['BA'] }];
  const changed = setRoles(team, 'ba@example.com', ['QA', 'BA']);
  assert.deepEqual(changed.team[1], { email: 'ba@example.com', roles: ['BA', 'QA'] });
  const removed = removeMember(changed.team, 'ba@example.com');
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.team.map((m) => m.email), ['po@example.com']);
  assert.equal(removed.replaceToken, true, 'asks to replace the project token');
  assert.equal(setRoles(team, 'ba@example.com', []).ok, false, 'at least one role');
  assert.equal(removeMember(team, 'x@example.com').ok, false, 'unknown person');
});

test('TC-064 (REQ-032, REQ-035): email matching picks the projects of a signed-in person', () => {
  const projects = [
    { id: 'A', team: [{ email: 'ba@example.com', roles: ['BA'] }] },
    { id: 'B', team: [{ email: 'BA@EXAMPLE.COM', roles: ['QA'] }] },
    { id: 'C', team: [{ email: 'dev@example.com', roles: ['Dev'] }] },
  ];
  assert.deepEqual(accessFor(projects, { email: 'Ba@example.com', emailVerified: true }), [{ id: 'A', roles: ['BA'] }, { id: 'B', roles: ['QA'] }]);
  assert.deepEqual(accessFor(projects, { email: 'ba@example.com', emailVerified: false }), [], 'unverified email');
  assert.deepEqual(accessFor(projects, { email: 'x@example.com', emailVerified: true }), [], 'on no team');
  assert.deepEqual(accessFor(projects, null), [], 'signed out');
  const sa = { email: 'PO@example.com', emailVerified: true };
  assert.equal(isSuperAdmin(sa, ['po@example.com']), true);
  assert.deepEqual(accessFor(projects, sa, ['po@example.com']).map((p) => p.id), ['A', 'B', 'C'], 'super admin sees every project');
});

test('TC-066 (REQ-033): role → gate rules, including several roles and the super admin', () => {
  const gates = ['intent', 'requirements', 'design', 'tests', 'build', 'release', 'team'];
  const allowed = (roles, sa = false) => gates.filter((g) => canPass(g, roles, sa));
  assert.deepEqual(allowed(['BA', 'QA']), ['requirements', 'tests']);
  assert.deepEqual(allowed(['UX']), ['design']);
  assert.deepEqual(allowed(['DM']), ['release']);
  assert.deepEqual(allowed(['PO']), ['intent', 'requirements', 'design', 'release']);
  assert.deepEqual(allowed(['Admin']), ['team']);
  assert.deepEqual(allowed([]), []);
  assert.deepEqual(allowed([], true), gates);
  assert.equal(gateHint('design'), 'Needs the UX or PO role');
  assert.equal(gateHint('build'), 'Needs the Dev role');
});

test('TC-071 (REQ-036): approvedBy names the person and the role that owns the gate', () => {
  assert.equal(approvedBy('Ba@Example.com', ['BA', 'QA'], 'requirements'), 'ba@example.com (BA)');
  assert.equal(approvedBy('ba@example.com', ['BA', 'QA'], 'tests'), 'ba@example.com (QA)');
  assert.equal(approvedBy('po@example.com', ['Admin'], 'design', true), 'po@example.com (super admin)');
});
