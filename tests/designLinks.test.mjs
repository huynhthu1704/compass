// F-003 Project design files: TC-500, TC-501 and the source part of TC-502 (REQ-080, REQ-082).
// src/designLinks.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkDesignInput, checkFigmaUrl, checkMiroUrl, designFiles, designPreviews, designToolText, fileName, figmaEmbed, isDesignAdmin, miroEmbed, saveDesignFiles } from '../src/designLinks.ts';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const FIG = 'https://www.figma.com/design/79331aUkgSOKxR8y54x6fS/Compass';
const MIRO = 'https://miro.com/app/board/uXjVKa1b2c3=/';

test('TC-500 (REQ-080): Figma and Miro links are checked before they are saved', () => {
  for (const ok of [FIG, 'https://figma.com/file/abc123/Old', 'https://www.figma.com/proto/abc/P?node-id=1-2', 'https://www.figma.com/board/abc/Jam', '']) {
    assert.equal(checkFigmaUrl(ok), null, `${ok} is a Figma link (or empty)`);
  }
  for (const ok of [MIRO, 'https://miro.com/app/board/uXjVAbc=/?share_link_id=1', 'https://miro.com/app/board/o9J_lAbc=', '']) {
    assert.equal(checkMiroUrl(ok), null, `${ok} is a Miro board link (or empty)`);
  }
  const badFigma = ['http://www.figma.com/design/abc/x', 'https://evil.com/figma.com/design/x', 'https://figma.com.evil.com/design/x', 'https://www.figma.com/files/recent', MIRO, 'figma.com/design/abc'];
  badFigma.push('https://www.figma.com/community/file/123', 'https://u:p@www.figma.com/design/abc/x', 'https://www.figma.com:8443/design/abc/x');
  for (const bad of badFigma) assert.match(checkFigmaUrl(bad) || '', /figma\.com design, file, proto or board link/, `${bad} is rejected`);
  const badMiro = ['https://miro.com/about', 'https://miro.com:444/app/board/abc=/', 'https://u@miro.com/app/board/abc=/', 'http://miro.com/app/board/abc=/', 'https://evil.com/miro.com/app/board/abc=/', 'https://miro.com.evil.com/app/board/abc=/', FIG];
  for (const bad of badMiro) assert.match(checkMiroUrl(bad) || '', /Paste a Miro board link: https:\/\/miro\.com\/app\/board\//, `${bad} is rejected`);
});

test('TC-501 (REQ-080, REQ-082): saving writes designTool and keeps old projects working', () => {
  // Old Figma project: adding Miro keeps kind + url, clearing it removes only miroUrl.
  const fig = { kind: 'figma', url: FIG };
  assert.deepEqual(designFiles(fig), { figma: FIG });
  const both = saveDesignFiles(fig, { figma: FIG, miro: MIRO });
  assert.deepEqual(both, { kind: 'figma', url: FIG, miroUrl: MIRO });
  assert.deepEqual(designFiles(both), { figma: FIG, miro: MIRO });
  assert.deepEqual(saveDesignFiles(both, { figma: FIG, miro: '' }), { kind: 'figma', url: FIG });
  // Clearing Figma with Miro left: Miro becomes the one link.
  const miroOnly = saveDesignFiles(both, { figma: '', miro: MIRO });
  assert.deepEqual(miroOnly, { kind: 'miro', url: MIRO });
  assert.deepEqual(designFiles(miroOnly), { miro: MIRO });
  // Nothing left: designTool is removed.
  assert.equal(saveDesignFiles(miroOnly, { figma: '', miro: '' }), undefined);
  assert.deepEqual(designFiles(undefined), {});
  assert.deepEqual(designFiles({ kind: 'figma', url: '', miroUrl: MIRO }), { miro: MIRO }, 'a hand-edited spec keeps its board');
  assert.deepEqual(saveDesignFiles({ kind: 'figma', url: '', miroUrl: MIRO }, { figma: '', miro: MIRO }), { kind: 'miro', url: MIRO });
  const ps = read('src/pages/ProjectSettings.tsx');
  assert.match(ps, /id="design-miro" aria-describedby="design-miro-help"/, 'the error is linked to its field');

  // Old Penpot project: shown as "other", kept when only Miro is saved.
  const pen = { kind: 'penpot', url: 'https://design.penpot.app/#/view/abc' };
  assert.deepEqual(designFiles(pen), { other: pen });
  assert.deepEqual(saveDesignFiles(pen, { figma: '', miro: MIRO }), { kind: 'penpot', url: pen.url, miroUrl: MIRO });
  assert.deepEqual(saveDesignFiles(pen, { figma: '', miro: '' }), pen, 'the old link stays when the admin saves empty fields');
  // A Figma link replaces the old Penpot link.
  assert.deepEqual(saveDesignFiles(pen, { figma: FIG, miro: '' }), { kind: 'figma', url: FIG });
  // An older Figma link that predates the checks (a Figma project page) does not block adding the Miro board.
  const oldFig = { kind: 'figma', url: 'https://www.figma.com/files/team/123/project/456' };
  assert.deepEqual(checkDesignInput(oldFig, { figma: oldFig.url, miro: MIRO }), {}, 'an unchanged stored link is not re-checked');
  assert.deepEqual(saveDesignFiles(oldFig, { figma: oldFig.url, miro: MIRO }), { ...oldFig, miroUrl: MIRO });
  assert.match(checkDesignInput(oldFig, { figma: 'https://evil.com/figma.com/design/x', miro: '' }).figma || '', /figma\.com design/, 'a changed link is checked');
  assert.match(checkDesignInput(undefined, { figma: '', miro: 'https://miro.com/about' }).miro || '', /Miro board link/);
  // Spaces around a pasted link are trimmed.
  assert.deepEqual(saveDesignFiles(undefined, { figma: `  ${FIG} `, miro: '' }), { kind: 'figma', url: FIG });
});

test('TC-502 (REQ-080): only the admin role edits; the page shows the hint and the empty state', () => {
  const off = (role) => ({ role, signIn: 'off', superAdmin: false, projectRoles: [] });
  assert.equal(isDesignAdmin(off('PO')), true, 'sign-in off: the PO role picker stands in for the admin');
  for (const r of ['BA', 'DM', 'UX', 'Dev', 'QA', 'Ops', undefined]) assert.equal(isDesignAdmin(off(r)), false, `${r} is not the admin`);
  const on = (projectRoles, superAdmin = false) => ({ role: 'PO', signIn: 'signed-in', superAdmin, projectRoles });
  assert.equal(isDesignAdmin(on(['BA', 'Admin'])), true, 'sign-in on: the project Admin');
  assert.equal(isDesignAdmin(on([], true)), true, 'sign-in on: the super admin');
  assert.equal(isDesignAdmin(on(['PO'])), false, 'sign-in on: the role picker no longer decides');
  assert.equal(isDesignAdmin({ role: 'PO', signIn: 'signed-out', superAdmin: false, projectRoles: [] }), false);
  assert.equal(isDesignAdmin({ role: 'PO', signIn: 'signed-in', superAdmin: false, projectRoles: [], demo: true }), true, 'demo with sign-in on: the role picker (REQ-040)');
  assert.equal(isDesignAdmin({ role: 'BA', signIn: 'signed-in', superAdmin: false, projectRoles: [], demo: true }), false);
  assert.equal(isDesignAdmin({ role: undefined, signIn: 'signed-in', superAdmin: true, projectRoles: [], demo: true }), true, 'the super admin on a sample project');
  const src = read('src/pages/ProjectSettings.tsx');
  assert.match(src, /isDesignAdmin\(\{ role: settings\.role, signIn: session\.status, superAdmin: session\.superAdmin, projectRoles, demo: !!session\.demo \|\| !!p\.demo \}\)/);
  assert.match(src, /Only the project admin can change the design files\./);
  assert.match(src, /No design files linked yet\./);
  assert.match(src, /saveDesignFiles\(/);
  assert.match(read('src/components/DesignFilesPanel.tsx'), /rel="noreferrer"/, 'the shared file row opens links safely');
  assert.match(read('src/App.tsx'), /sub === 'settings' \? <ProjectSettingsPage p=\{p\} \/>/);
});

test('TC-503 (REQ-081): Miro and Figma preview URLs, and which previews the Design page shows', () => {
  assert.equal(miroEmbed('https://miro.com/app/board/uXjVAbc=/?share_link_id=1'), 'https://miro.com/app/live-embed/uXjVAbc=/');
  assert.equal(figmaEmbed(FIG), `https://www.figma.com/embed?embed_host=compass&url=${encodeURIComponent(FIG)}`);
  for (const bad of ['https://miro.com/about', 'https://evil.com/x', '', undefined]) assert.equal(miroEmbed(bad), null);
  for (const bad of ['https://evil.com/figma.com/design/x', 'https://design.penpot.app/#/view/abc', '', undefined]) assert.equal(figmaEmbed(bad), null);
  // Both linked → two previews (the switch shows); the feature's Figma frame wins over the project file.
  const frame = 'https://www.figma.com/design/79331aUkgSOKxR8y54x6fS/Compass?node-id=1-2';
  const both = designPreviews(designFiles({ kind: 'figma', url: FIG, miroUrl: MIRO }), frame);
  assert.deepEqual(both.map((x) => x.kind), ['figma', 'miro']);
  assert.equal(both[0].src, figmaEmbed(frame));
  assert.equal(both[1].src, 'https://miro.com/app/live-embed/uXjVKa1b2c3=/');
  assert.deepEqual(designPreviews(designFiles({ kind: 'miro', url: MIRO })).map((x) => x.kind), ['miro'], 'one linked → one preview, no switch');
  assert.deepEqual(designPreviews({}), [], 'nothing linked → the empty state');
});

test('TC-504 (REQ-082): the design agent and AGENTS.md name both design files', () => {
  assert.equal(designToolText({ kind: 'figma', url: FIG, miroUrl: MIRO }), `Figma ${FIG} · Miro ${MIRO}`);
  assert.equal(designToolText({ kind: 'miro', url: MIRO }), `Miro ${MIRO}`);
  assert.equal(designToolText(undefined), null);
  const harness = read('src/harness.ts');
  assert.match(harness, /DESIGN TOOL: \$\{designToolText\(p\.spec\.designTool\) \|\| '\(none connected\)'\}/);
  assert.doesNotMatch(harness, /designTool\.kind/, 'no prompt or output names only the first tool');
  const fw = read('src/framework.ts');
  assert.doesNotMatch(fw, /designTool\.kind\}\]\(\$\{p\.spec\.designTool\.url/, 'AGENTS.md names every file, not only kind/url');
  assert.match(fw, /designToolMd\(p\.spec\.designTool\)/);
  assert.match(fw, /Design tool: \$\{designToolMd\(tool\)/);
});

test('TC-507 (REQ-082): an old Penpot, Sketch or Other link is named after its tool and gets no preview', () => {
  for (const [kind, name] of [['penpot', 'Penpot link'], ['sketch', 'Sketch link'], ['other', 'Other link']]) {
    const tool = { kind, url: 'https://example.com/design' };
    const f = designFiles(tool);
    assert.deepEqual(f, { other: tool });
    assert.equal(fileName(kind), name);
    assert.deepEqual(designPreviews(f), []);
    assert.equal(designToolText(tool), `${name.replace(' link', '')} https://example.com/design`);
  }
  assert.equal(fileName('figma'), 'Figma file');
  assert.equal(fileName('miro'), 'Miro board');
});

test('TC-506 (REQ-081, source part): the Design page has a Design files button and panel, and no edit fields', () => {
  const src = read('src/pages/Design.tsx');
  assert.doesNotMatch(src, /Project design tool/, 'the old editable box is gone');
  assert.doesNotMatch(src, /designTool: tool/, 'the Design page never writes designTool');
  assert.match(src, /Design files · none/);
  assert.match(src, /No design files linked yet/);
  assert.match(src, /<DesignFilesPanel /);
  const panel = read('src/components/DesignFilesPanel.tsx');
  assert.match(panel, /role="dialog"/);
  assert.match(panel, /aria-label="Design files"/);
  assert.match(panel, /Escape/);
  assert.match(panel, /Change in Project settings →/);
  assert.match(panel, /Only the project admin can change the design files\./);
  assert.doesNotMatch(panel, /<input/, 'no edit fields in the panel');
  assert.match(panel, /document\.addEventListener\('keydown', onKey, true\)/, 'Esc works wherever focus is');
  assert.match(panel, /document\.addEventListener\('focusin', onFocus\)/, 'focus cannot leave the panel');
  assert.match(panel, /\/\^https:\\\/\\\/\/i\.test\(url\)/, 'only https links are opened');
  assert.match(src, /titleRight=\{filesButton\}/, 'the button stays next to the title (SCR-3, SCR-4)');
  assert.match(src, /ArrowRight/, 'the preview switch follows the arrow keys');
});
