# Plan: REQ-110 The account menu's arrow keys in the acceptance criteria

Feature: F-013 · Requirements: REQ-110 · Test cases: TC-510
Intent: compass/intent/2026-11-28-sidebar-account-menu.md · Design: compass/design/2026-11-28-account-menu.md

## Files
- compass/plans/REQ-110-arrow-keys-ac.md — this plan
- compass/spec.json, compass/requirements.md, compass/tests.md — REQ-110 AC4 (arrow keys); TC-510 gherkin says they wrap
- tests/sidebar.test.mjs — TC-510 also asserts the wrap-around; comments name AC4 and AC6

## Steps
1. Add AC4 to REQ-110 (worded for both header states and only while focus is in the menu); regenerate the views.
2. Add the wrap assertion to TC-510 and "wrap around at the ends" to its gherkin; fix the AC numbers in the comments.
3. Run `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- The AC must say only what the code does (`moveFocus` and the `.account-menu` key handler); no behaviour changes.

## Proof
- `npm test` incl. TC-510 (header start point and wrap-around), check-spec and guardrails OK.
