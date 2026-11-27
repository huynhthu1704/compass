# Plan: REQ-081, REQ-082 Design page with the preview in focus; agents name both design files

Feature: F-003 · Requirements: REQ-081, REQ-082 (agents part) · Test cases: TC-503, TC-504, TC-505, TC-506, TC-507
Intent: compass/intent/2026-11-27-project-design-files.md · Design: compass/design/2026-11-27-project-design-files.md
(SCR-3, SCR-3b, SCR-4, SCR-4b)

This is build 2 of 2. Build 1 (`REQ-080-082-project-settings-design-files.md`) added Project settings, the link checks
and the storage (`src/designLinks.ts`).

## Files
- compass/plans/REQ-081-082-design-page-preview.md: this plan (first commit)
- src/designLinks.ts: adds the preview URLs (`figmaEmbed`, `miroEmbed`), the previews a Design page shows
  (`designPreviews`), and the one line that names the project's design files for agents and AGENTS.md (`designToolText`)
- src/pages/Design.tsx: the "Project design tool" box goes away. The page head gets a "Design files" button (count, or
  "· none") at the top right; the phone label is "Files". A full-width preview follows, with a Figma/Miro switch only when
  both are linked. The empty state reads "No design files linked yet". The side panel shows the rows with Open ↗, plus
  "Change in Project settings →" for the admin
- src/components/DesignFilesPanel.tsx (new): the panel. It is a dialog labelled "Design files" with focus moved in on
  open, and Esc, ✕ or a click outside closes it and puts focus back on the button. It reuses the row from Project
  settings (moved here and exported)
- src/pages/ProjectSettings.tsx: imports the shared row (no behaviour change)
- src/index.css: the side panel (420 px from the right) and, below 700 px, the bottom sheet; the preview frame
- src/framework.ts: `designMd` and AGENTS.md name both files through `designToolText`
- src/harness.ts: the design agent's prompt (`DESIGN TOOL:`) and its demo output name both files
- tests/designLinks.test.mjs: TC-503 (preview URLs), TC-504 (agent prompt and AGENTS.md text), TC-507 (an old
  Penpot/Sketch/Other link is named after its tool and gets no preview), plus source checks for the Design page
  (button, panel, no edit fields)

## Steps
1. Commit this plan.
2. Extend the tests first (TC-503, TC-504, TC-507, Design-page source checks). They fail.
3. Add the helpers to src/designLinks.ts.
4. Add DesignFilesPanel and rebuild the top of Design.tsx. Add the CSS.
5. Switch framework.ts and harness.ts to `designToolText`.
6. Run `npm test`, `npm run build`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main`.
   Take screenshots of the Design page (desktop and 390 px, panel and sheet open, empty state) and run TC-506 by hand.

## Risks
- **Embeds from other sites.** The previews are plain iframes from www.figma.com/embed and miro.com/app/live-embed,
  built only from links that passed the checks. Nothing from the link is placed into HTML.
- **Focus traps or lost focus.** The panel keeps a ref to the button and moves focus back on every way of closing.
  Esc is handled on the panel; a click on the backdrop closes it.
- **Old projects.** A Penpot/Sketch/Other link gets no preview. It is listed in the panel under its tool (TC-507), and
  the feature's own frame link still previews when it is a Figma link.
- **AGENTS.md and design views change wording** for projects that use the portal: only the design-tool line, which now
  lists both files ("Figma <url> · Miro <url>").

## Proof
- `npm test`: TC-503, TC-504 and TC-507 pass, along with all earlier tests.
- `npm run build`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main` pass.
- Screenshots of SCR-3, SCR-3b and SCR-4b in the app; TC-505 and TC-506 run by hand and reported in the PR.
