// F-013 Sidebar navigation — TC-400, TC-402, TC-403, TC-404, TC-406, TC-407 (REQ-070 … REQ-075), TC-510 (REQ-110).
// TC-401 (keyboard focus) and TC-405 (desktop/phone, light/dark) are checked with screenshots.
// src/sidebar.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accountCard, accountChips, accountMenu, accountName, approvalCount, featureRows, projectLinks, projectState, settingsLink, signedInCard, teamLink, themeToggle, WORKSPACE_LINKS } from '../src/sidebar.ts';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const runs = (...statuses) => statuses.map((status) => ({ status }));

test('TC-400 (REQ-070): groups, link order, icons and the project card state', () => {
  assert.deepEqual(WORKSPACE_LINKS.map((l) => [l.label, l.path]), [['Projects', '/'], ['Agent architecture', '/architecture']]);
  const links = projectLinks('p1', []);
  assert.deepEqual(links.map((l) => [l.label, l.path]), [
    ['Feature board', '/p/p1'], ['Team floor', '/p/p1/floor'], ['Agent runs', '/p/p1/runs'], ['Release', '/p/p1/release'],
  ]);
  for (const l of [...WORKSPACE_LINKS, ...links]) assert.ok(l.icon, `${l.label} has an icon`);
  assert.equal(new Set([...WORKSPACE_LINKS, ...links].map((l) => l.icon)).size, 6, 'every link has its own icon');
  // REQ-080, ADR-015: Project settings, for every role, is the last link — after Release and after the Admin-only Team item.
  assert.deepEqual(settingsLink('p1'), { key: 'settings', label: 'Project settings', path: '/p/p1/settings', icon: 'settings' });
  assert.ok(![...WORKSPACE_LINKS, ...links, teamLink('p1')].some((l) => l.icon === 'settings'), 'the gear icon is its own');
  const side = read('src/components/Sidebar.tsx');
  assert.match(side, /\{team && link\(teamLink\(p\.id\), sub === 'team'\)\}\s*\{link\(settingsLink\(p\.id\), sub === 'settings'\)\}/, 'rendered after Team, for every role');

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
  assert.match(src, /<span className="side-avatar" aria-hidden>\{p\.name\.slice\(0, 1\)\.toUpperCase\(\)\}<\/span>/, 'the card shows the first letter');
  assert.match(src, /<span className="side-name">\{p\.name\}<\/span>/, 'the card shows the project name');
  const app = read('src/App.tsx');
  assert.match(app, /<Sidebar parts=\{parts\} p=\{p\}/, 'App renders the Sidebar component');
  assert.doesNotMatch(app, /Knowledge \(RAG\)/, 'the old sidebar markup is gone from App');
});

test('TC-402 (REQ-071): the approval count shows once, on Team floor', () => {
  const links = projectLinks('p1', runs('awaiting-approval', 'running', 'awaiting-approval', 'done', 'awaiting-approval'));
  const withCount = links.filter((l) => l.count);
  assert.deepEqual(withCount.map((l) => l.label), ['Team floor']);
  assert.deepEqual(withCount[0].count, { n: 3, label: '3 waiting for approval', title: '3 agent runs waiting for your approval' });
  assert.equal(withCount[0].title, '3 agent runs waiting for your approval');
  assert.equal(approvalCount(runs('awaiting-approval')).title, '1 agent run waiting for your approval');
  assert.equal(approvalCount(runs('running', 'done')), null);
  assert.ok(projectLinks('p1', runs('done')).every((l) => !l.count), 'no runs waiting → no count');
});

test('TC-403 (REQ-072): feature rows, heading count, tooltip and two-line names', () => {
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

test('TC-404 (REQ-073): account card and one theme button', () => {
  assert.deepEqual(accountCard('alice'), { initial: 'A', name: '@alice', state: 'GitHub connected', tone: 'success' });
  assert.deepEqual(accountCard(undefined), { initial: '?', name: 'Not connected', state: 'Demo mode · connect', tone: 'warning' });
  assert.deepEqual(themeToggle('light'), { next: 'dark', label: 'Switch to dark theme', icon: 'moon' });
  assert.deepEqual(themeToggle('dark'), { next: 'light', label: 'Switch to light theme', icon: 'sun' });
  assert.equal(themeToggle(themeToggle('light').next).next, 'light', 'clicking twice returns to the first theme');

  const src = read('src/components/Sidebar.tsx');
  assert.match(src, /onClick=\{choose\(\(\) => go\('\/connect'\)\)\}/, 'Connections (in the account menu, REQ-110 / ADR-019) opens Connections');
  assert.equal((src.match(/store\.setSettings\(\{ theme:/g) || []).length, 1, 'exactly one theme button');
  assert.match(src, /title=\{theme\.label\}/, 'the theme switch names the theme it switches to (REQ-110: a "Dark theme" switch in the menu)');
  assert.match(src, /onClick=\{choose\(\(\) => store\.setSettings\(\{ theme: theme\.next \}\)\)\}/, 'the switch changes to the other theme');
  assert.match(read('src/index.css'), /\.sidebar button:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/, 'sidebar buttons show the focus ring (TC-401)');
  assert.match(read('src/index.css'), /\.sidebar \.nav button\[aria-current="page"\]:focus-visible \{[^}]*var\(--focus-ring\)/, 'the current page keeps its focus ring next to the brand bar');
});

test('TC-406 (REQ-074): no "AI dev portal" tagline in the UI', async () => {
  const { readdirSync } = await import('node:fs');
  const files = readdirSync(new URL('../src/', import.meta.url), { recursive: true }).filter((f) => /\.(tsx?|css|html)$/.test(f));
  // Code comments are not shown in the UI (src/types.ts starts with one), so they are stripped before the search.
  const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const f of files) assert.doesNotMatch(noComments(read(`src/${f}`)), /AI dev portal/i, `src/${f} shows the tagline`);
  assert.match(read('src/components/Sidebar.tsx'), /<div className="brand-text">Compass<\/div>/, 'the brand is "Compass" only');
  assert.match(read('src/pages/Onboarding.tsx'), /<div className="overline t-brand">Compass<\/div>/, 'the overline is "Compass"');
});

test('TC-407 (REQ-075): no Knowledge link in the sidebar for any role; the page still opens', () => {
  // The sidebar links take no role, so the same list is shown to PO, BA, DM, UX, Dev, QA and Ops.
  for (const runs of [[], [{ status: 'awaiting-approval' }]]) {
    for (const l of [...WORKSPACE_LINKS, ...projectLinks('p1', runs)]) {
      assert.doesNotMatch(l.path, /knowledge/, `${l.label} does not point to Knowledge`);
      assert.doesNotMatch(l.label, /knowledge/i);
    }
  }
  assert.equal(projectLinks.length, 2, 'projectLinks(projectId, runs) has no role argument');
  const sidebar = read('src/components/Sidebar.tsx');
  assert.doesNotMatch(sidebar, /knowledge/i, 'no Knowledge link or icon in the Sidebar component');
  assert.doesNotMatch(read('src/sidebar.ts').replace(/\/\*[\s\S]*?\*\//g, ''), /'knowledge'/, 'no knowledge link key or icon');
  assert.match(read('src/App.tsx'), /sub === 'knowledge' \? <KnowledgePage p=\{p\} \/>/, 'the /knowledge route still renders the page');
});

test('F-015 (REQ-030, REQ-032): the Team item and the signed-in account card', () => {
  assert.deepEqual(teamLink('p1'), { key: 'team', label: 'Team', path: '/p/p1/team', icon: 'team', title: 'People on this project and their roles' });
  assert.deepEqual(signedInCard('ba@example.com', false), { initial: 'B', name: 'ba@example.com', state: 'Google sign-in', tone: 'success' });
  assert.equal(signedInCard('po@example.com', true).state, 'Google · super admin');
});

test('TC-510 (REQ-110): the footer is one account card; the account menu lists the right items for each state', () => {
  assert.equal(accountName('huynhthingocthu1704@gmail.com'), 'huynhthingocthu1704');
  assert.deepEqual(accountChips({ signedIn: true, superAdmin: true, roles: ['PO'] }).map((c) => c.label), ['Super admin', 'PO']);
  assert.deepEqual(accountChips({ signedIn: true, roles: ['BA', 'QA'] }).map((c) => c.label), ['BA', 'QA']);
  assert.deepEqual(accountChips({ signedIn: true, roles: [] }).map((c) => c.label), ['Google'], 'signed in without a role on this project');
  assert.deepEqual(accountChips({ signedIn: true, demo: true, superAdmin: true, roles: ['PO'], demoRole: 'BA' }).map((c) => c.label), ['Demo · BA'], 'the demo role replaces the real roles');
  assert.deepEqual(accountChips({ signedIn: false, roles: [] }), [], 'sign-in off: no chips, the role picker shows the role');

  assert.deepEqual(accountMenu({ signedIn: true }), ['connections', 'theme', 'sign-out']);
  assert.deepEqual(accountMenu({ signedIn: true, demo: true }), ['connections', 'theme', 'leave-demo', 'sign-out']);
  assert.deepEqual(accountMenu({ signedIn: false }), ['connections', 'theme'], 'sign-in off: no Sign out');

  const src = read('src/components/Sidebar.tsx');
  const footer = src.slice(src.indexOf('className="sidebar-footer"'), src.indexOf('function ProjectGroup'));
  assert.doesNotMatch(footer, /Try the demo|enterDemo/, 'no "Try the demo" in the sidebar (ADR-019)');
  assert.doesNotMatch(footer, /My roles/, 'the role is shown once, as chips');
  assert.match(footer, /aria-haspopup="menu"/, 'the account card opens the menu');
  assert.match(footer, /aria-expanded=\{open\}/);
  assert.match(footer, /role="menu"/);
  // arrow keys work from anywhere in the popover, including after the header was clicked
  assert.match(footer, /<div className="account-menu" onKeyDown=\{\(e\) => \{ if \(e\.key === 'ArrowDown' \|\| e\.key === 'ArrowUp'\) moveFocus\(e\); \}\}>/, 'the arrow keys are handled on the whole popover');
  assert.match(src, /items\[i < 0 \? \(down \? 0 : items\.length - 1\)/, 'from the header, ArrowDown goes to the first item and ArrowUp to the last');
  assert.match(footer, /role="menuitemcheckbox"[^>]*aria-checked=\{settings\.theme === 'dark'\}/, 'the theme is a switch in the menu');
  assert.match(footer, /<AccountMenu open=\{open\} setOpen=\{setOpen\} onKeyDown=\{\(e\) => \{ if \(open && e\.key === 'Escape'\) \{ setOpen\(false\); cardRef\.current\?\.focus\(\); \} \}\}>/, 'Escape closes the menu from the card or the menu and returns focus to the card');
  assert.match(src, /className="account" onKeyDown=\{onKeyDown\}/, 'the Escape handler sits on the card + menu wrapper');
  assert.match(footer, /<div className="account-menu-head" tabIndex=\{-1\}>[\s\S]*?<\/div>\s*<div className="account-menu-items" role="menu"/, 'the email header is beside role="menu", not inside it');
  assert.match(footer, /\{\(!signedIn \|\| session\.demo\) && <div className="row gap-sm account-role"/, 'the role picker only with sign-in off or in the demo');
  const css = read('src/index.css');
  assert.match(css, /\.account-menu \{[^}]*position: absolute[^}]*bottom: 100%/, 'the menu opens upward inside the footer');
  assert.match(css, /\.account-menu \{[^}]*left: 0; right: 0/, 'on desktop the menu stays within the sidebar width');
  // AC3: every way of closing the menu
  assert.match(src, /const choose = \(act: \(\) => void\) => \(\) => \{ setOpen\(false\); cardRef\.current\?\.focus\(\); act\(\); \}/, 'a choice closes the menu and returns focus to the card');
  for (const act of [/onClick=\{choose\(\(\) => go\('\/connect'\)\)\}/, /onClick=\{choose\(\(\) => void signOut\(\)\)\}/, /onClick=\{choose\(\(\) => \{ leaveDemo\(\); go\('\/'\); \}\)\}/, /onClick=\{choose\(\(\) => store\.setSettings\(\{ theme: theme\.next \}\)\)\}/]) assert.match(footer, act);
  assert.match(src, /document\.addEventListener\('pointerdown', close\)[\s\S]*?if \(!ref\.current\?\.contains\(e\.target as Node\)\) setOpen\(false\)|if \(!ref\.current\?\.contains\(e\.target as Node\)\) setOpen\(false\)[\s\S]*?document\.addEventListener\('pointerdown', close\)/, 'a click outside closes the menu');
  assert.match(src, /onBlur=\{\(e\) => \{ if \(open && e\.relatedTarget && !ref\.current\?\.contains\(e\.relatedTarget as Node\)\) setOpen\(false\); \}\}/, 'Tab (focus leaving the card and menu) closes it');
  // AC5: on phones the menu opens in place above the card, inside the Menu drawer
  assert.match(css, /@media \(max-width: 900px\) \{ \.account \{ display: flex; flex-direction: column-reverse; \} \.account-menu \{ position: static;/, 'phone: the menu is in the page flow, above the card');
});
