// F-003 Project design files: TC-500, TC-501 and the source part of TC-502 (REQ-080, REQ-082).
// src/designLinks.ts is pure (types-only imports), so Node 22 runs it directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkFigmaUrl, checkMiroUrl, designFiles, isDesignAdmin, saveDesignFiles } from '../src/designLinks.ts';

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
  for (const bad of badFigma) assert.match(checkFigmaUrl(bad) || '', /figma\.com design, file, proto or board link/, `${bad} is rejected`);
  const badMiro = ['https://miro.com/about', 'http://miro.com/app/board/abc=/', 'https://evil.com/miro.com/app/board/abc=/', 'https://miro.com.evil.com/app/board/abc=/', FIG];
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

  // Old Penpot project: shown as "other", kept when only Miro is saved.
  const pen = { kind: 'penpot', url: 'https://design.penpot.app/#/view/abc' };
  assert.deepEqual(designFiles(pen), { other: pen });
  assert.deepEqual(saveDesignFiles(pen, { figma: '', miro: MIRO }), { kind: 'penpot', url: pen.url, miroUrl: MIRO });
  assert.deepEqual(saveDesignFiles(pen, { figma: '', miro: '' }), pen, 'the old link stays when the admin saves empty fields');
  // A Figma link replaces the old Penpot link.
  assert.deepEqual(saveDesignFiles(pen, { figma: FIG, miro: '' }), { kind: 'figma', url: FIG });
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
  const src = read('src/pages/ProjectSettings.tsx');
  assert.match(src, /isDesignAdmin\(\{ role: settings\.role, signIn: session\.status, superAdmin: session\.superAdmin, projectRoles \}\)/);
  assert.match(src, /Only the project admin can change the design files\./);
  assert.match(src, /No design files linked yet\./);
  assert.match(src, /saveDesignFiles\(/);
  assert.match(src, /rel="noreferrer"/);
  assert.match(read('src/App.tsx'), /sub === 'settings' \? <ProjectSettingsPage p=\{p\} \/>/);
});
