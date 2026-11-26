# Plan: REQ-013, REQ-014 Clear status labels and a readable stage strip on phones

Feature: F-011 · Requirements: REQ-013, REQ-014 · Test cases: TC-023 … TC-026
Intent: compass/intent/2026-11-26-status-labels-and-phone-stages.md · Design: compass/design/F-011.md (Figma SCR-1, SCR-2)

## Files
- compass/plans/REQ-013-014-labels-and-phone-stages.md — this plan (first commit)
- src/ui.tsx — one shared mapping for status labels: `REQ_STATUS_TONE` (Draft → neutral, Approved → success,
  In build → info, Done → success) and `DESIGN_STATUS_TONE` (Draft → neutral, Approved → success)
- src/pages/Requirements.tsx, src/pages/Tests.tsx, src/pages/Feature.tsx, src/pages/Build.tsx — requirement status labels use
  `REQ_STATUS_TONE` instead of their own inline rules. Small extra change, stated here: on Tests and Feature "In build" was
  honey (brand) and becomes info (sky), like on Requirements and Build, so every page uses the same rule
- src/pages/Design.tsx — the design status label uses `DESIGN_STATUS_TONE`
- src/pages/Feature.tsx — the stage strip gets a `stage-strip` class instead of the inline `repeat(5, …)` columns
- src/index.css — `.stage-strip`: five columns on screens 720 px and wider (as today); one stage per row below 720 px,
  words never broken (`overflow-wrap: normal; word-break: normal`)
- tests/readability.test.mjs — TC-023 (all five pages use the shared mapping, values as above) and TC-024 (neutral, info and
  success text reach 4.5:1 on their backgrounds in light and dark mode)
- No spec status change in this PR: marking REQ-013/014 In build would regenerate four views and pass the 12-file limit; the
  statuses move to Done with the release.

## Steps
1. Commit this plan.
2. Write tests/readability.test.mjs (fails on today's code), then the shared mapping in src/ui.tsx and the five pages.
3. Move the stage strip columns into `.stage-strip` with a phone rule below 720 px.
4. `npm test`, `node compass/check-spec.mjs`, `npm run build`; Playwright screenshots of a feature page at 390 px and 1440 px and of
   the Requirements and Design pages in light and dark mode, compared with main.

## Risks
- **A page keeps its own rule:** TC-023 reads all five files and fails if any status label is not taken from the shared mapping.
- **Desktop stage strip changes by accident:** the 720 px+ rule repeats today's five columns; TC-026 compares 1440 px screenshots.
- **Contrast:** TC-024 checks the three tones in both modes (the tokens already pass TC-015).

## Proof
- `npm test`: TC-023 and TC-024 pass, plus all earlier tests (honey theme, Team floor, scripts).
- `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build` pass.
- Screenshots: feature page at 390 px (TC-025, no broken words) and 1440 px before/after (TC-026); Requirements and Design labels.
