# Plan: REQ-003, REQ-004 — unit tests for the checking scripts, and no drift

Feature: F-008 · Requirements: REQ-003 (#4), REQ-004 (#5) · Test cases: TC-003, TC-004
Intent: compass/intent/2026-11-26-compass-follows-its-own-process.md (Approved) · Design: none: process change, no UI
PR 2 of 2 (stacked on PR 1, the framework + CI setup).

## Files
- `package.json` — `"test": "node --test tests/"` (Node's built-in runner; no dependency added)
- `tests/checkSpec.test.mjs` (new) — runs src/framework/check-spec.mjs against small spec fixtures in a temp folder
- `tests/guardrails.test.mjs` (new) — planProblems, checkChange and decideEdit from src/framework/guardrails-lib.mjs
- `tests/noDrift.test.mjs` (new) — compass/ copies are byte-identical to src/framework/
- `compass/spec.json` (TC-003/004 Passing, REQ-003/004 In build) + regenerated requirements.md, tests.md, handover.md
- this plan

## Steps
1. Commit this plan first.
2. Write the three test files; add the npm test script.
3. Mutation check: break each check on purpose and confirm a test fails; restore.
4. Update the spec statuses and regenerate the views with the portal's own generator.

## Risks
- check-spec reads its spec next to itself, so the tests copy it into temp folders; they clean up after themselves.
- The no-drift test makes every later change to src/framework/ also update compass/ in the same PR (that is the point).
- CI's guardrails step now applies (12-file limit, plan check, protected paths) — this PR stays at 9 files.

## Proof
- `npm test` passes; each check broken on purpose makes at least one test fail (recorded in the PR).
- `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs <base>` pass.
