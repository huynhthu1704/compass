# Plan: REQ-080, REQ-082 Project settings page with the project's Figma file and Miro board

Feature: F-003 · Requirements: REQ-080, REQ-082 (storage part) · Test cases: TC-500, TC-501, TC-502, TC-400
Intent: compass/intent/2026-11-27-project-design-files.md · Design: compass/design/2026-11-27-project-design-files.md
(SCR-0, SCR-1, SCR-2, SCR-2b) · Decision: ADR-015

This is build 1 of 2, because the whole change is more than 12 files. Build 2 (`REQ-081-082-design-page-preview.md`)
does the Design page (button, side panel, Miro preview) and names both files in the design agent's prompt and AGENTS.md.

## Files
- compass/plans/REQ-080-082-project-settings-design-files.md: this plan (first commit)
- src/designLinks.ts (new, pure, types-only imports): checks a Figma and a Miro link, reads the project's files from
  `designTool` (old single-link projects included), builds the new `designTool` when saving, and decides who the admin
  is (project Admin or super admin with sign-in on; the PO role with sign-in off)
- src/types.ts: `DesignToolKind` gains `'miro'`; `DesignTool` gains an optional `miroUrl`
- src/pages/ProjectSettings.tsx (new): the Project settings page with the "Design files" card. The admin sees the two
  fields, Save and Cancel, with errors. Everyone else sees one row per file with Open ↗, or "No design files linked
  yet"
- src/sidebar.ts: `settingsLink`, "Project settings" (gear icon) for every role
- src/components/Sidebar.tsx: the gear icon, and the link rendered last: after Release and after Team access's
  Admin-only Team item (ADR-015; REQ-075 removed Knowledge)
- src/App.tsx: the route `/p/<id>/settings`
- tests/designLinks.test.mjs (new): TC-500 (link checks) and TC-501 (saving keeps old projects working); the page uses
  the helpers and shows the admin hint (TC-502 source check; the manual run is in the PR)
- tests/sidebar.test.mjs: TC-400 expects the new link, its own icon, and that it comes after Team
- src/pages/Design.tsx: the old one-link box (replaced in build 2) uses the shared tool names without Miro, starts
  from the main link, saves through `saveMainLink` (keeps the Miro board, never writes kind 'miro'), and only the
  admin sees Change or the edit fields
- The wording of REQ-070's link-order criterion and of TC-400 ("Project settings" last, ADR-015) is changed
  in the spec PR (#87), so this build changes no spec file

## Steps
1. Commit this plan.
2. Write tests/designLinks.test.mjs and the TC-400 change first. They fail because the helpers and the link do not exist yet.
3. Add src/designLinks.ts and the type changes, then the sidebar link and the route.
4. Build ProjectSettings.tsx with the existing UI parts (`PageHead`, `Field`, `Button`, `Badge`, `card`). No new CSS.
5. Point Design.tsx's tool names at `TOOL_NAMES`.
6. Run `npm test`, `npm run build`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main`.
   Take screenshots of the page as PO and as BA, on desktop and on a phone.

## Risks
- **Old projects lose their link.** `designFiles()` reads every old `{kind, url}` shape. Saving only a Miro link
  keeps `kind` and `url` untouched (TC-501). A Penpot, Sketch or Other link is kept until the admin saves a Figma link,
  and the field help says so.
- **Unsafe links.** Only `https://` links on figma.com or miro.com board paths are accepted (no look-alike hosts such
  as `evil.com/figma.com/…`). Links open with `rel="noreferrer"` in a new tab.
- **Who is the admin.** Team access (F-015) is now on main. With sign-in on, the project's Admin (from the team in
  Firebase) or the super admin edits the links. With sign-in off (demo, local use) the PO role picker stands in, as the
  intent says. It is one function (`isDesignAdmin`, TC-502). It is a UI check: `designTool` lives in the repo's
  spec.json, which only people with GitHub write access can change anyway. In the demo project (no team) the role picker
  decides even with sign-in on, as Team access does for the demo (REQ-040).
- **The old Design-page box could drop the Miro board** (review of #102). It now saves through `saveMainLink`, which
  keeps `miroUrl`, and it no longer offers Miro (set on Project settings). TC-501 covers both.
- **Old links that predate the checks** (e.g. a Figma project page) would block saving the Miro board. Only a changed
  link is checked (`checkDesignInput`, TC-501). Links with a port or a user name/password are rejected (TC-500).
- **A Miro-only project edited in the old box** (second review of #102) wrote the Figma link as kind 'miro'. The box
  now starts from `mainLink` (empty Figma for a Miro-only project) and `saveMainLink` ignores a 'miro' kind (TC-501).
- **The Design page still has its old editable box until build 2.** It keeps working on the same `designTool`
  (Figma, Penpot, Sketch, Other). A saved Miro link only appears on Project settings until build 2 lands.

## Proof
- `npm test`: TC-500, TC-501 and TC-400 pass, along with every earlier test.
- `npm run build`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main` pass.
- Screenshots: Project settings as PO (fields, error) and as BA (read-only rows, hint), desktop and 390 px. TC-502 is
  run by hand and reported in the PR.
