// F-013 Sidebar navigation — TC-039, TC-041, TC-042, TC-043 (REQ-020 … REQ-023).
// TC-040 (keyboard focus) and TC-044 (desktop/phone, light/dark) are checked with screenshots.
// src/sidebar.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WORKSPACE_LINKS, accountCard, approvalCount, featureRows, projectLinks, projectState, themeToggle } from '../src/sidebar.ts';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const runs = (...statuses) => statuses.map((status) => ({ status }));

test('TC-039 (REQ-020): groups, link order, icons, Knowledge tooltip and the project card state', () => {
  assert.deepEqual(WORKSPACE_LINKS.map((l) => [l.label, l.path]), [['Projects', '/'], ['Agent architecture', '/architecture']]);
  const links = projectLinks('p1', []);
  assert.deepEqual(links.map((l) => [l.label, l.path]), [
    ['Feature board', '/p/p1'], ['Team floor', '/p/p1/floor'], ['Agent runs', '/p/p1/runs'], ['Release', '/p/p1/release'], ['Knowledge', '/p/p1/knowledge'],
  ]);
  for (const l of [...WORKSPACE_LINKS, ...links]) assert.ok(l.icon, `${l.label} has an icon`);
  assert.equal(new Set([...WORKSPACE_LINKS, ...links].map((l) => l.icon)).size, 7, 'every link has its own icon');
  assert.equal(links.at(-1).title, 'Project knowledge the agents search (RAG)');

  assert.deepEqual(projectState({ demo: true }, null), { text: 'Demo project', tone: 'neutral' });
  assert.deepEqual(projectState({}, { tone: 'success', text: 'Synced with GitHub' }), { text: 'Synced with GitHub', tone: 'success' });
  assert.deepEqual(projectState({}, { tone: 'danger', text: 'Sync failed' }), { text: 'Sync failed', tone: 'danger' });
  assert.deepEqual(projectState({ repo: null }, null), { text: 'Local project', tone: 'neutral' });
  assert.deepEqual(projectState({ repo: { owner: 'o', name: 'n' } }, null), { text: 'On GitHub · connect to sync', tone: 'warning' }, 'on GitHub without a token');

  // The component renders three groups: workspace nav, the project section (only with a project) and the footer.
  const src = read('src/components/Sidebar.tsx');
  assert.match(src, /aria-label="Workspace"/);
  assert.match(src, /\{p && <ProjectGroup /);
  assert.match(src, /className="sidebar-footer"/);
  assert.match(src, /onClick=\{\(\) => go\('\/'\)\}[^>]*>\s*<span className="side-avatar"/, 'the project card opens the project list');
  const app = read('src/App.tsx');
  assert.match(app, /<Sidebar parts=\{parts\} p=\{p\}/, 'App renders the Sidebar component');
  assert.doesNotMatch(app, /Knowledge \(RAG\)/, 'the old sidebar markup is gone from App');
});

test('TC-041 (REQ-021): the approval count shows once, on Team floor', () => {
  const links = projectLinks('p1', runs('awaiting-approval', 'running', 'awaiting-approval', 'done', 'awaiting-approval'));
  const withCount = links.filter((l) => l.count);
  assert.deepEqual(withCount.map((l) => l.label), ['Team floor']);
  assert.deepEqual(withCount[0].count, { n: 3, label: '3 waiting for approval', title: '3 agent runs waiting for your approval' });
  assert.equal(withCount[0].title, '3 agent runs waiting for your approval');
  assert.equal(approvalCount(runs('awaiting-approval')).title, '1 agent run waiting for your approval');
  assert.equal(approvalCount(runs('running', 'done')), null);
  assert.ok(projectLinks('p1', runs('done')).every((l) => !l.count), 'no runs waiting → no count');
});

test('TC-042 (REQ-022): feature rows, heading count, tooltip and two-line names', () => {
  const features = [
    { id: 'F-001', name: 'Publish & share trips' },
    { id: 'F-002', name: 'Allow the trip owner to choose who can see each cost line and receipt', archived: false },
    { id: 'F-003', name: 'Old idea', archived: true },
  ];
  const stage = { 'F-001': 'release', 'F-002': 'idea', 'F-003': 'done' };
  const name = (s) => ({ release: 'Release', idea: 'Idea', done: 'Done' })[s];
  const rows = featureRows(features, undefined, (id) => stage[id], name);
  assert.equal(rows.length, 2, 'archived features are hidden');
  assert.deepEqual(rows[0], { id: 'F-001', short: 'F01', name: 'Publish & share trips', stage: 'release', title: 'F-001 · Publish & share trips — Release' });
  assert.equal(rows[1].title, `F-002 · ${features[1].name} — Idea`, 'the tooltip has the full name');
  assert.equal(featureRows(features, 'F-003', (id) => stage[id], name).length, 3, 'an open archived feature stays listed');

  const src = read('src/components/Sidebar.tsx');
  assert.match(src, /className="nav-heading-count"[^>]*>\{rows\.length\}/, 'the heading shows the row count');
  assert.match(src, /title=\{f\.title\}/);
  assert.match(src, /\(\['idea', 'requirements', 'design', 'tests', 'build'\] as Stage\[\]\)\.map/, 'the open feature lists its five stages');
  assert.match(src, /\{st\[s\]\.done \? '✓' : STAGES\.indexOf\(s\) \+ 1\}/, 'each stage shows ✓ or its step number');
  assert.match(read('src/index.css'), /\.nav-stages \{[^}]*border-left/, 'the stages are indented under the feature');
  const css = read('src/index.css');
  assert.match(css, /\.nav-features > \.stack > button \.nav-label \{[^}]*-webkit-line-clamp: 2/, 'names wrap to two lines');
});

test('TC-043 (REQ-023): account card and one theme button', () => {
  assert.deepEqual(accountCard('alice'), { initial: 'A', name: '@alice', state: 'GitHub connected', tone: 'success' });
  assert.deepEqual(accountCard(undefined), { initial: '?', name: 'Not connected', state: 'Demo mode · connect', tone: 'warning' });
  assert.deepEqual(themeToggle('light'), { next: 'dark', label: 'Switch to dark theme', icon: 'moon' });
  assert.deepEqual(themeToggle('dark'), { next: 'light', label: 'Switch to light theme', icon: 'sun' });
  assert.equal(themeToggle(themeToggle('light').next).next, 'light', 'clicking twice returns to the first theme');

  const src = read('src/components/Sidebar.tsx');
  assert.match(src, /onClick=\{\(\) => go\('\/connect'\)\}/, 'the account card opens Connections');
  assert.equal((src.match(/store\.setSettings\(\{ theme:/g) || []).length, 1, 'exactly one theme button');
  assert.match(src, /aria-label=\{theme\.label\}/);
  assert.match(src, /onClick=\{\(\) => store\.setSettings\(\{ theme: theme\.next \}\)\}/, 'the button switches to the other theme');
  assert.match(read('src/index.css'), /\.sidebar button:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/, 'sidebar buttons show the focus ring (TC-040)');
});
