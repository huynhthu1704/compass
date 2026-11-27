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
  is (PO role until Team access, F-015)
- src/types.ts: `DesignToolKind` gains `'miro'`; `DesignTool` gains an optional `miroUrl`
- src/pages/ProjectSettings.tsx (new): the Project settings page with the "Design files" card. The admin sees the two
  fields, Save and Cancel, with errors. Everyone else sees one row per file with Open ↗, or "No design files linked
  yet". A note says Team and the GitHub token come later
- src/sidebar.ts: the project group gets "Project settings" (gear icon) after Knowledge
- src/components/Sidebar.tsx: the gear icon path
- src/App.tsx: the route `/p/<id>/settings`
- tests/designLinks.test.mjs (new): TC-500 (link checks) and TC-501 (saving keeps old projects working); the page uses
  the helpers and shows the admin hint (TC-502 source check; the manual run is in the PR)
- tests/sidebar.test.mjs: TC-400 expects the new link, its own icon and the order
- compass/spec.json: REQ-070's link-order criterion and TC-400's wording add "Project settings" after Knowledge
  (ADR-015); compass/requirements.md and compass/tests.md are regenerated

## Steps
1. Commit this plan.
2. Write tests/designLinks.test.mjs and the TC-400 change first. They fail because the helpers and the link do not exist yet.
3. Add src/designLinks.ts and the type changes, then the sidebar link and the route.
4. Build ProjectSettings.tsx with the existing UI parts (`PageHead`, `Field`, `Button`, `Badge`, `card`). No new CSS.
5. Update REQ-070 / TC-400 wording and regenerate the views with the portal's generator.
6. Run `npm test`, `npm run build`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main`.
   Take screenshots of the page as PO and as BA, on desktop and on a phone.

## Risks
- **Old projects lose their link.** `designFiles()` reads every old `{kind, url}` shape. Saving only a Miro link
  keeps `kind` and `url` untouched (TC-501). A Penpot, Sketch or Other link is kept until the admin saves a Figma link,
  and the field help says so.
- **Unsafe links.** Only `https://` links on figma.com or miro.com board paths are accepted (no look-alike hosts such
  as `evil.com/figma.com/…`). Links open with `rel="noreferrer"` in a new tab.
- **Not real access control.** "Admin" is the PO role picked in the sidebar until Team access (F-015) adds sign-in.
  This is stated in the intent, and the check is a single function (`isDesignAdmin`) so F-015 can swap it.
- **The Design page still has its old editable box until build 2.** It keeps working on the same `designTool`
  (Figma, Penpot, Sketch, Other). A saved Miro link only appears on Project settings until build 2 lands.

## Proof
- `npm test`: TC-500, TC-501 and TC-400 pass, along with every earlier test.
- `npm run build`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main` pass.
- Screenshots: Project settings as PO (fields, error) and as BA (read-only rows, hint), desktop and 390 px. TC-502 is
  run by hand and reported in the PR.
