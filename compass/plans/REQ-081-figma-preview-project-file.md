# Plan: REQ-081 Figma preview shows the project's Figma file

Feature: F-003 · Requirements: REQ-081 · Test cases: TC-530 (TC-503 still passes)
Intent: compass/intent/2026-11-27-project-design-files.md · Design: compass/design/2026-11-27-project-design-files.md

## Problem
On the demo project (Travel Journal), F-001's Design page shows Figma's "Invalid URL" box even after the Figma
file is set in Project settings. F-001's own frame link is `https://www.figma.com/design/demo/Travel-Journal?…`:
a made-up file ("demo"). `designPreviews()` always prefers the feature's frame link, so the project file is never used.

## Files
- `tests/designLinks.test.mjs` — TC-530, committed first and failing.
- `compass/spec.json` — TC-530 under REQ-081.
- `src/designLinks.ts` — `figmaFileKeys()`; `designPreviews()` uses the feature frame only when it is in the project's
  Figma file (or the project has no Figma file), else the project file.
- `src/demo.ts` — remove the made-up frame link from F-001.

## Steps
1. Commit the plan, TC-530 and its spec entry; `npm test` fails on TC-530.
2. Add `figmaFileKeys()` (the file key, plus the branch key for a branch link) and the same-file rule in `designPreviews()`.
3. Drop `url` from the demo F-001 design.
4. `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs main`, build.

## Risks
- A team that links a feature frame in a separate Figma file while the project has its own Figma file now sees the
  project file. `compass/design/README.md` puts every feature's screens in the project file, so this should be rare;
  the frame is still one click away in the design files panel / spec. Called out in the PR for the Owner.
- Demo projects already saved in a browser keep the old frame link; the new rule handles them, so no data migration.

## Proof
- `npm test`: TC-530 fails at commit 1 and passes after the fix; TC-503 still passes.
- Manual: demo project → Project settings → set a Figma file → F-001 Design shows that file in the preview.
