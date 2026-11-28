// F-015 Team access (REQ-030 … REQ-036) — TC-060 … TC-064, TC-066, TC-071.
// src/team.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAST_ADMIN, accessFor, addMember, applyTeamOp, approvalBy, approvalSig, canReuseApproval, canOpenConnections, peopleChanges, workspaceSettings, checksApprovals, gateForAgent, gatesApply, sharedOpenProblem, recordItems, parseApprovedBy, projectVisible, startScreen, unconfirmedApprovals, missingTokenMessage, sharedToOpen, withReqsInBuild, approvedBy, baselineFrom, canPass, gateHint, isSuperAdmin, membersFromDoc, pickToken, removeMember, setRoles, teamDoc } from '../src/team.ts';

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

test('TC-078 (REQ-041 AC1, AC7): GitHub calls use the shared work token for signed-in people', () => {
  assert.equal(pickToken(undefined, 'work-token', true), 'work-token', 'a member without their own token uses the work token');
  assert.equal(pickToken('own-token', 'work-token', true), 'work-token', 'signed in: the work token, never the device token');
  assert.equal(pickToken('own-token', null, true), undefined, 'no work token yet → missing, even with a device token');
  assert.equal(pickToken('own-token', 'work-token', false), 'own-token', 'sign-in off → device token, as before');
});

test('TC-078 (REQ-041 AC5): with no work token, a signed-in person is told to ask a super admin', () => {
  assert.equal(missingTokenMessage(true), 'No GitHub token yet — ask a super admin');
  assert.equal(missingTokenMessage(false), 'Connect GitHub first', 'sign-in off: as before');
});

test('TC-068 (REQ-034 AC4): In build is prepared on a copy, so a refused GitHub commit leaves the spec unchanged', () => {
  const spec = { requirements: [{ id: 'REQ-001', status: 'Approved' }, { id: 'REQ-002', status: 'Approved' }] };
  const next = withReqsInBuild(spec, ['REQ-002']);
  assert.deepEqual(next.requirements.map((q) => q.status), ['Approved', 'In build']);
  assert.deepEqual(spec.requirements.map((q) => q.status), ['Approved', 'Approved'], 'the input (the store copy) is not changed');
});

test('TC-064 (REQ-032 AC2): shared projects not on this device are offered to open', () => {
  const access = [{ id: 'a', roles: ['BA'], repo: { owner: 'O', name: 'Travel' } }, { id: 'b', roles: ['QA'], repo: { owner: 'o', name: 'shop' } }, { id: 'c', roles: ['UX'] }];
  assert.deepEqual(sharedToOpen(access, [{ owner: 'o', name: 'travel' }, null]).map((a) => a.id), ['b'], 'Travel is local (case-insensitive); c has no repo');
  assert.deepEqual(sharedToOpen(access, []).map((a) => a.id), ['a', 'b']);
});

test('TC-066 (REQ-033): approving an agent run passes the gate of its stage', () => {
  assert.deepEqual(['ideation', 'requirements', 'designer', 'testdesign', 'coder', 'reviewer', 'release'].map(gateForAgent), ['intent', 'requirements', 'design', 'tests', 'build', 'build', 'release']);
});

test('TC-071 (REQ-036, REQ-037 AC3): the record role is the role that owns the gate, or "super admin"', () => {
  assert.deepEqual(approvalBy('Ba@Example.com', ['QA', 'BA'], 'requirements'), { role: 'BA', text: 'ba@example.com (BA)' });
  assert.deepEqual(approvalBy('ba@example.com', ['QA', 'BA'], 'tests'), { role: 'QA', text: 'ba@example.com (QA)' });
  assert.deepEqual(approvalBy('po@example.com', ['PO'], 'build', true), { role: 'super admin', text: 'po@example.com (super admin)' });
  assert.equal(approvalBy('dev@example.com', ['Dev'], 'design'), null);
});

test('TC-075 (REQ-039, REQ-040): the role picker is shown only without Firebase or inside the demo, never before sign-in', () => {
  const on = (o) => startScreen({ firebase: true, status: 'signed-in', demo: false, hasRole: false, hasAccess: true, ...o });
  assert.equal(on({}), 'app', 'signed in with team roles: no role screen');
  assert.equal(on({ hasRole: true }), 'app', 'a role picked earlier does not matter');
  assert.equal(on({ hasAccess: false }), 'no-access');
  assert.equal(on({ hasAccess: false, demo: true }), 'role-picker', 'Try the demo → pick a role');
  assert.equal(on({ hasAccess: false, demo: true, hasRole: true }), 'app');
  assert.equal(on({ status: 'signed-out', demo: true }), 'sign-in', 'no demo before sign-in');
  assert.equal(on({ status: 'loading' }), 'loading');
  assert.equal(startScreen({ firebase: false, status: 'off', demo: false, hasRole: false, hasAccess: false }), 'role-picker', 'sign-in off: as today');
  assert.equal(startScreen({ firebase: false, status: 'off', demo: false, hasRole: true, hasAccess: false }), 'app');
});

test('TC-076 (REQ-040 AC2/AC3): in the demo only sample projects are visible; never a real project', () => {
  const real = { repo: { owner: 'O', name: 'Travel' } }, sample = { repo: null, demo: true }, local = { repo: null };
  const demo = { status: 'signed-in', demo: true, superAdmin: true, accessIds: ['o__travel'] };
  assert.deepEqual([real, sample, local].map((p) => projectVisible(p, demo)), [false, true, false], 'even the super admin sees only samples in the demo');
  const member = { status: 'signed-in', demo: false, superAdmin: false, accessIds: ['o__travel'] };
  assert.deepEqual([real, sample, local].map((p) => projectVisible(p, member)), [true, false, false]);
  assert.equal(projectVisible(real, { status: 'off', superAdmin: false, accessIds: [] }), true, 'sign-in off: as before');
});

test('TC-073 (REQ-038): approvals in neither the baseline nor a Firebase record are unconfirmed, whatever their date', () => {
  const spec = {
    features: [
      { id: 'F-001', idea: { approvedBy: 'po@example.com (PO)', approvedAt: '2026-11-01' }, design: { status: 'Approved', approvedBy: 'ux@example.com (UX)', approvedAt: '2026-11-20' } },
    ],
    requirements: [
      { id: 'REQ-001', featureId: 'F-001', status: 'Approved', approvedBy: 'ba@example.com (BA)' },   // has a record
      { id: 'REQ-002', featureId: 'F-001', status: 'In build', approvedBy: 'ba@example.com (PO)' },   // record says BA, claims PO
      { id: 'REQ-003', featureId: 'F-001', status: 'Draft' },
    ],
    tests: [
      { id: 'TC-001', reqIds: ['REQ-001'], approvedBy: 'qa@example.com (QA)' },   // a tests record names TC-001
      { id: 'TC-002', reqIds: ['REQ-003'], approvedBy: 'qa@example.com (QA)' },   // no tests record names TC-002
      { id: 'TC-003', reqIds: ['REQ-001'] },                                      // not approved: nothing to check
    ],
  };
  const ev = {
    hasBaseline: true,
    baseline: [{ item: 'F-001', gate: 'intent', approvedBy: 'po@example.com (PO)' }],
    records: [
      { items: ['REQ-001', 'REQ-002'], gate: 'requirements', email: 'BA@example.com', role: 'BA' },
      { items: ['F-001', 'TC-001'], gate: 'tests', email: 'qa@example.com', role: 'QA' },
    ],
  };
  const ids = (list) => list.map((a) => `${a.gate}:${a.item}`);
  assert.deepEqual(ids(unconfirmedApprovals(spec, ev)), ['design:F-001', 'requirements:REQ-002', 'tests:TC-002'],
    'the design (dated before the team) has no record; REQ-002 claims the wrong role; TC-002 has no tests record');
  assert.deepEqual(ids(unconfirmedApprovals(spec, { ...ev, hasBaseline: false, baseline: [] })), ['intent:F-001', 'design:F-001', 'requirements:REQ-002', 'tests:TC-002'],
    'no baseline: every approval without a record is flagged, the intent included');
  const forged = { ...spec, features: [{ ...spec.features[0], idea: { approvedBy: 'mallory@example.com (PO)' } }] };
  assert.ok(ids(unconfirmedApprovals(forged, ev)).includes('intent:F-001'), 'an intent approvedBy changed after the baseline is flagged');
  const recordByFeature = { ...ev, records: [...ev.records, { items: ['F-001', 'REQ-003'], gate: 'tests', email: 'qa@example.com', role: 'QA' }] };
  assert.ok(ids(unconfirmedApprovals(spec, recordByFeature)).includes('tests:TC-002'), 'a forged test case is flagged: a record for its feature or requirement does not name it');
  const recordByTc = { ...ev, records: [...ev.records, { items: ['F-001', 'TC-002'], gate: 'tests', email: 'qa@example.com', role: 'QA' }] };
  assert.ok(!ids(unconfirmedApprovals(spec, recordByTc)).includes('tests:TC-002'), 'a tests record naming the test case confirms it');
  assert.deepEqual(recordItems({ id: 'run1', featureId: 'F-001', proposal: { tests: [{ id: 'TC-002' }, { id: 'TC-004' }] } }), ['F-001', 'TC-002', 'TC-004']);
  assert.deepEqual(recordItems({ id: 'run1', featureId: 'F-001', reqIds: ['REQ-001'] }), ['REQ-001']);
  // Demo mode, local projects and projects without a team are never checked, so nothing is flagged (REQ-038 AC4).
  const base = { signedIn: true, demoSession: false, demoProject: false, hasRepo: true, hasTeam: true };
  assert.equal(checksApprovals(base), true);
  for (const k of ['demoSession', 'demoProject']) assert.equal(checksApprovals({ ...base, [k]: true }), false, k);
  for (const k of ['signedIn', 'hasRepo', 'hasTeam']) assert.equal(checksApprovals({ ...base, [k]: false }), false, k);
  assert.deepEqual(parseApprovedBy('Ba@Example.com (BA)'), { email: 'ba@example.com', role: 'BA' });
  assert.equal(parseApprovedBy('the Product Owner (in chat)'), null);
});

test('TC-072 (part, REQ-037 AC4): a retry reuses its record only for the same person and the same version', () => {
  const run = { proposal: { requirements: [{ id: 'REQ-001', title: 'A' }] }, changes: [] };
  const sig = approvalSig(run);
  const saved = { id: 'rec1', by: 'ba@example.com (BA)', email: 'ba@example.com', sig };
  assert.equal(canReuseApproval(saved, 'BA@example.com', sig), true, 'same person, same version: reuse');
  assert.equal(canReuseApproval(saved, 'po@example.com', sig), false, 'another person signed in: new record');
  assert.equal(canReuseApproval(saved, undefined, sig), false, 'signed out: no reuse');
  const revised = approvalSig({ ...run, proposal: { requirements: [{ id: 'REQ-001', title: 'B' }] } });
  assert.notEqual(revised, sig);
  assert.equal(canReuseApproval(saved, 'ba@example.com', revised), false, 'a revised version: new record');
  assert.equal(canReuseApproval(undefined, 'ba@example.com', sig), false);
  assert.equal(canReuseApproval({ id: 'old', by: 'x' }, 'ba@example.com', sig), false, 'a record saved before this check has no email/sig');
});

test('TC-066 (REQ-033): approval gates fail closed while sign-in is on and nobody is signed in', () => {
  const real = { hasRepo: true, demoProject: false };
  assert.equal(gatesApply({ firebase: true, status: 'loading', ...real }), true, 'signing in or loading: gated, so no role passes');
  assert.equal(gatesApply({ firebase: true, status: 'signed-out', ...real }), true);
  assert.equal(gatesApply({ firebase: true, status: 'signed-in', ...real }), true);
  assert.equal(gatesApply({ firebase: false, status: 'off', ...real }), false, 'sign-in off: as before');
  assert.equal(gatesApply({ firebase: true, status: 'signed-in', hasRepo: true, demoProject: true }), false, 'demo project');
  assert.equal(gatesApply({ firebase: true, status: 'signed-in', hasRepo: false, demoProject: false }), false, 'local project');
});

test('TC-064 (REQ-032 AC2, REQ-034): a shared project that the token cannot reach, or that was renamed, is not opened', () => {
  const want = { owner: 'Acme', name: 'Travel' };
  assert.equal(sharedOpenProblem(want, { owner: 'acme', name: 'travel' }), null, 'same repo, any letter case');
  assert.match(sharedOpenProblem(want, null, 404), /token cannot reach Acme\/Travel — ask an Admin/);
  assert.match(sharedOpenProblem(want, { owner: 'acme', name: 'travel-map' }), /is now acme\/travel-map on GitHub \(renamed or moved\) — ask an Admin/);
  assert.match(sharedOpenProblem(want, { owner: 'other', name: 'Travel' }), /renamed or moved/);
});

test('TC-079 (part, REQ-041 AC3): a team change lists who joins and who leaves, for their people records', () => {
  const before = [{ email: 'po@example.com', roles: ['PO'] }, { email: 'ba@example.com', roles: ['BA'] }];
  assert.deepEqual(peopleChanges([], before), { joined: ['po@example.com', 'ba@example.com'], left: [] }, 'a first team: everyone joins');
  assert.deepEqual(peopleChanges(before, [...before, { email: 'QA@Example.com', roles: ['QA'] }]), { joined: ['qa@example.com'], left: [] });
  assert.deepEqual(peopleChanges(before, [before[0]]), { joined: [], left: ['ba@example.com'] });
  assert.deepEqual(peopleChanges(before, [{ email: 'BA@example.com', roles: ['BA', 'QA'] }, before[0]]), { joined: [], left: [] }, 'changing roles or letter case is no change');
});

test('TC-078 (REQ-041 AC1, AC5, AC7): signed in, the shared key, model and auto-sync replace the device settings', () => {
  const ws = { anthropicKey: 'shared-key', model: 'claude-opus-5-5', autoSync: false };
  assert.deepEqual(workspaceSettings(ws, { signedIn: true, demo: false }), { apiKey: 'shared-key', model: 'claude-opus-5-5', autoSync: false });
  assert.deepEqual(workspaceSettings({}, { signedIn: true, demo: false }), { apiKey: undefined, model: 'claude-sonnet-5-5', autoSync: true }, 'no shared key → demo agents, even with a key on the device');
  assert.deepEqual(workspaceSettings(null, { signedIn: true, demo: false }), { apiKey: undefined, model: 'claude-sonnet-5-5', autoSync: true }, 'not loaded yet or refused');
  assert.equal(workspaceSettings(ws, { signedIn: true, demo: true }), null, 'demo: device settings');
  assert.equal(workspaceSettings(ws, { signedIn: false, demo: false }), null, 'sign-in off: device settings');
});

test('TC-080 (part, REQ-041 AC2, REQ-110 AC2): only super admins open Connections while signed in', () => {
  assert.equal(canOpenConnections({ signedIn: true, demo: false, superAdmin: true }), true);
  assert.equal(canOpenConnections({ signedIn: true, demo: false, superAdmin: false }), false, 'a member');
  assert.equal(canOpenConnections({ signedIn: true, demo: true, superAdmin: false }), true, 'demo: as before');
  assert.equal(canOpenConnections({ signedIn: false, demo: false, superAdmin: false }), true, 'sign-in off: as before');
});
