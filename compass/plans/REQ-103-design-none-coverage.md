# Plan: REQ-103 Design coverage respects "design: none" (bug #31)

Feature: F-003 · Requirement: REQ-103 (design stage, baseline) · Test case: TC-310 · Issue: #31 (bug)
Intent: compass/intent/F-003.md · Design: none (generated text in compass/design/F-xxx.md only)

## Files
- compass/plans/REQ-103-design-none-coverage.md — this plan (first commit)
- tests/designCoverage.test.mjs — TC-310, committed before the fix (fails first)
- src/designCoverage.ts — new pure function `designCoverage(requirements, screens)`: requirements that no screen delivers are
  split into "not covered" and "no screen needed" (a requirement whose `design` is `none: <reason>`, with its reason)
- src/framework.ts — `designMd()` uses it: the Coverage section warns only about requirements that really need a screen and
  lists "No screen needed" ones with their reason
- compass/spec.json + compass/tests.md + compass/handover.md — TC-310
- compass/design/F-011.md — regenerated: REQ-015 moves from "⚠ Not covered" to "No screen needed"

## Steps
1. Commit this plan.
2. Add TC-310 and commit the failing test.
3. Add src/designCoverage.ts and use it in designMd(); the test passes.
4. Regenerate only the views this change touches (design/F-011.md, tests.md, handover.md); other per-feature views are
   stale on main for unrelated reasons and stay as they are.

## Risks
- **Hiding a real gap:** only `none: <reason>` with a non-empty reason counts (the same rule check-spec uses); a requirement
  that points to its own design file is still listed if no screen delivers it.
- **Generator drift:** `compass/check-spec.mjs` and `src/framework/` are not touched.

## Proof
- `npm test`: TC-310 failed before the fix (second commit) and passes after; all earlier tests pass.
- `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build` pass.
- compass/design/F-011.md shows "No screen needed: REQ-015 — width limit and padding only …".
