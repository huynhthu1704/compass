# Plan: REQ-081 Figma preview shows the project's Figma file

Feature: F-003 · Requirements: REQ-081 · Test cases: TC-530 (TC-503 still passes)
Intent: compass/intent/2026-11-27-project-design-files.md · Design: compass/design/2026-11-27-project-design-files.md

## Problem
On the demo project (Travel Journal), F-001's Design page shows Figma's "Invalid URL" box even after the Figma
file is set in Project settings. F-001's own frame link is `https://www.figma.com/design/demo/Travel-Journal?…`:
a made-up file ("demo"). `designPreviews()` always prefers the feature's frame link, so the project file is never used.

## Owner decision (2026-11-28, after the first review)
A real feature frame link always wins, as REQ-081 and its design say, even when it is in another Figma file. Only the
made-up demo link is skipped. So REQ-081, its design note and the Design page help text stay as they are.

## Files
- `tests/designLinks.test.mjs` — TC-530, committed first and failing; updated after the Owner's decision.
- `compass/spec.json` — TC-530 under REQ-081.
- `src/designLinks.ts` — `isDemoFigmaLink()`; `designPreviews()` skips a frame link to the made-up `demo` file, so the
  project's Figma file (from Project settings) is previewed instead.
- `src/demo.ts` — remove the made-up frame link from F-001.

## Steps
1. Commit the plan, TC-530 and its spec entry; `npm test` fails on TC-530.
2. Skip the made-up demo frame link in `designPreviews()`; drop `url` from the demo F-001 design.
3. After review: go back to "the frame always wins" for real links (Owner decision); only the exact `demo` key is skipped.
4. `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs main`, build, check in the built app.

## Risks
- A real Figma file whose key is exactly `demo` would not be previewed. Real Figma keys are long random strings, so
  this cannot happen; TC-530 checks that a key that only starts with "demo" is still previewed.
- Demo projects already saved in a browser keep the old frame link; the skip handles them, so no data migration.

## Proof
- `npm test`: TC-530 fails at commit 1 and passes after the fix; TC-503 (frame wins over the project file) still passes.
- Built app: demo project → Project settings → set a Figma file → F-001 Design previews that file.
