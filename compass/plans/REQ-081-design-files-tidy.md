# Plan: REQ-081 Tidy the Design files button (review notes from #106)

Feature: F-003 · Requirements: REQ-081 · Test cases: TC-506 (source part), TC-505 (manual)
Intent: compass/intent/2026-11-27-project-design-files.md · Design: compass/design/2026-11-27-project-design-files.md
(SCR-3, SCR-4)

The cosmetic notes left by the approving review of #106, which the Product Owner asked to tidy in a small PR.

## Files
- compass/plans/REQ-081-design-files-tidy.md: this plan (first commit)
- src/pages/Design.tsx:
  - On desktop the "Design files" button goes in the page head's right slot, after "Approve design" or "Reopen as
    draft", so it sits in the top-right corner as SCR-3 shows.
  - On a phone it stays next to the title ("Files"), as SCR-4 shows. Only one of the two is displayed at a time.
  - Focus goes back to whichever button is visible when the panel closes.
  - With no design yet, no empty right-hand column is rendered, so nothing pushes the button in from the edge.
- src/index.css: `.files-btn-desktop` / `.files-btn-phone` show one button per screen width (700 px, like the bottom sheet); if the head
  wraps, its buttons stay on the right (`margin-left: auto`), and on phones they take their own line so the title row
  keeps the full width (review of #108: checked every 10 px from 360 to 1400 px)
- tests/designLinks.test.mjs: TC-506 source checks for the two placements and the focus return
- compass/plans/REQ-081-082-design-page-preview.md: the Risks line says Esc is handled at document level (it no
  longer matches the code)

## Steps
1. Commit this plan.
2. Update the TC-506 source checks first; they fail.
3. Change Design.tsx and the CSS; fix the plan line.
4. Run `npm test`, `npm run build`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main`;
   check desktop and 390 px in the app (button position, panel, focus return, no sideways scrolling).

## Risks
- **Two buttons in the page.** Only one is displayed (`display: none` on the other, so it is neither focusable nor
  read out). Both open the same panel; focus returns to the one that is shown.
- **Other pages.** No shared component changes; `PageHead` is used as it is.

## Proof
- `npm test` with the updated TC-506 checks; `npm run build`; check-spec; check-guardrails.
- App run at 1280 px and 390 px: the button's position, Esc / ✕ / outside click returning focus, and no sideways scrolling.
