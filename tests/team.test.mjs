// F-015 Team access (REQ-030 … REQ-036) — TC-060 … TC-064, TC-066, TC-071.
// src/team.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAST_ADMIN, accessFor, addMember, applyTeamOp, approvedBy, baselineFrom, canPass, gateHint, isSuperAdmin, membersFromDoc, removeMember, setRoles, teamDoc } from '../src/team.ts';

test('TC-060 (REQ-030): adding a person normalises the email and keeps several roles', () => {
  const r = addMember([], 'Ba@Example.com ', ['QA', 'BA']);
  assert.equal(r.ok, true);
  assert.deepEqual(r.team, [{ email: 'ba@example.com', roles: ['BA', 'QA'] }]);
  assert.deepEqual(addMember([], 'qa@example.com', ['QA', 'QA', 'Foo']).team[0].roles, ['QA'], 'duplicate and unknown roles dropped');
  assert.equal(addMember([], 'x@example.com', ['Foo']).ok, false, 'only unknown roles → refused');
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
  const legacy = [{ email: 'BA@EXAMPLE.COM', roles: ['BA'] }];
  assert.equal(addMember(legacy, 'ba@example.com', ['QA']).ok, false, 'stored email matched case-insensitively');
  assert.equal(removeMember([...legacy, { email: 'po@example.com', roles: ['Admin'] }], 'ba@example.com').ok, true);
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
  const withEntry = [{ id: 'A', team: [{ email: 'po@example.com', roles: ['PO', 'Admin'] }] }, { id: 'B', team: [] }];
  assert.deepEqual(accessFor(withEntry, sa, ['po@example.com']), [{ id: 'A', roles: ['PO', 'Admin'] }, { id: 'B', roles: [] }], 'super admin keeps team roles');
});

test('TC-066 (REQ-033): role → gate rules, including several roles and the super admin', () => {
  const gates = ['intent', 'requirements', 'design', 'tests', 'build', 'release', 'team'];
  const allowed = (roles, sa = false) => gates.filter((g) => canPass(g, roles, sa));
  assert.deepEqual(allowed(['BA', 'QA']), ['requirements', 'tests']);
  assert.deepEqual(allowed(['UX']), ['design']);
  assert.deepEqual(allowed(['DM']), ['release']);
  assert.deepEqual(allowed(['PO']), ['intent', 'requirements', 'design', 'release']);
  assert.deepEqual(allowed(['Admin']), ['team']);
  assert.deepEqual(allowed(['Dev']), ['build']);
  assert.deepEqual(allowed([]), []);
  assert.deepEqual(allowed([], true), gates);
  assert.equal(gateHint('design'), 'Needs the UX or PO role');
  assert.equal(gateHint('build'), 'Needs the Dev role');
});

test('TC-071 (REQ-036): approvedBy names the person and the role that owns the gate', () => {
  assert.equal(approvedBy('Ba@Example.com', ['BA', 'QA'], 'requirements'), 'ba@example.com (BA)');
  assert.equal(approvedBy('ba@example.com', ['BA', 'QA'], 'tests'), 'ba@example.com (QA)');
  assert.equal(approvedBy('po@example.com', ['Admin'], 'design', true), 'po@example.com (super admin)');
  assert.equal(approvedBy('dev@example.com', ['Dev'], 'requirements'), null, 'no role that owns the gate → no audit text');
});

test('TC-060, TC-062 (REQ-030, REQ-031): a team becomes a Firestore document with Admin only in admins, and back', () => {
  const team = [{ email: 'PO@example.com', roles: ['PO', 'Admin'] }, { email: 'ba@example.com', roles: ['QA', 'BA'] }];
  const d = teamDoc('Travel Journal', { owner: 'o', name: 'r', defaultBranch: 'main' }, team);
  assert.deepEqual(d, {
    name: 'Travel Journal', repo: { owner: 'o', name: 'r' },
    members: ['po@example.com', 'ba@example.com'], admins: ['po@example.com'],
    team: { 'po@example.com': ['PO'], 'ba@example.com': ['BA', 'QA'] },
  });
  assert.deepEqual(membersFromDoc(d), [{ email: 'po@example.com', roles: ['PO', 'Admin'] }, { email: 'ba@example.com', roles: ['BA', 'QA'] }]);
  assert.deepEqual(membersFromDoc({ ...d, team: { ...d.team, 'ba@example.com': ['BA', 'Admin'] } })[1].roles, ['BA'], "'Admin' in a role list is ignored");
});

test('TC-073 (REQ-038 AC1): the baseline lists the approvals already in the spec', () => {
  const spec = {
    features: [{ id: 'F-001', design: { status: 'Approved', approvedBy: 'PO' } }, { id: 'F-002', design: { status: 'Draft' } }, { id: 'F-003' }],
    requirements: [{ id: 'REQ-001', status: 'Approved', approvedBy: 'the Product Owner (in chat)' }, { id: 'REQ-002', status: 'Draft' }, { id: 'REQ-003', status: 'Done' }],
  };
  assert.deepEqual(baselineFrom(spec), [
    { item: 'F-001', gate: 'design', approvedBy: 'PO' },
    { item: 'REQ-001', gate: 'requirements', approvedBy: 'the Product Owner (in chat)' },
    { item: 'REQ-003', gate: 'requirements', approvedBy: '' },
  ]);
});

test('TC-062, TC-063 (REQ-031): a change is applied to the team as saved now, so a stale page cannot bring back a removed person', () => {
  // A second Admin loaded [po, ba, dev]; meanwhile the super admin removed ba. The second Admin now adds qa.
  const saved = [{ email: 'po@example.com', roles: ['Admin'] }, { email: 'dev@example.com', roles: ['Dev'] }];
  const r = applyTeamOp(saved, { kind: 'add', email: 'qa@example.com', roles: ['QA'] });
  assert.deepEqual(r.team.map((m) => m.email), ['po@example.com', 'dev@example.com', 'qa@example.com'], 'ba stays removed');
  assert.deepEqual(applyTeamOp(saved, { kind: 'remove', email: 'po@example.com' }), { ok: false, team: saved, error: LAST_ADMIN });
  assert.equal(applyTeamOp(saved, { kind: 'set', email: 'dev@example.com', roles: ['Dev', 'QA'] }).team[1].roles.join(), 'QA,Dev');
  const first = applyTeamOp([], { kind: 'add', email: 'ba@example.com', roles: ['BA'] }, true);
  assert.equal(first.ok, false, 'a new team needs an Admin');
  assert.match(first.error, /new team needs an Admin/);
  assert.equal(applyTeamOp([], { kind: 'add', email: 'ba@example.com', roles: ['BA', 'Admin'] }, true).ok, true);
});
