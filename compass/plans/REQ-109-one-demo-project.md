# Plan: REQ-109 The project list keeps only one demo project

Feature: F-015 · Requirements: REQ-109 · Test cases: TC-509
Intent: compass/intent/2026-11-27-one-demo-project.md · Design: none (no new screen; the project list keeps its layout)

## Files
- compass/intent/2026-11-27-one-demo-project.md — the Product Owner's request in chat
- compass/spec.json — REQ-109 (F-015, `design: "none: …"`) and TC-509
- compass/requirements.md, compass/tests.md, compass/handover.md — regenerated views (if the generator touches them)
- src/demoOnce.ts — pure helpers: `openOrCreateDemo` and `keepOneDemo`
- src/pages/Projects.tsx — "Open demo project" / "Explore the demo" reuse the existing demo project
- src/store.ts — on load, duplicate demo projects saved earlier are dropped (the most recent one is kept)
- tests/demoOnce.test.mjs — TC-509

## Steps
1. Commit this plan.
2. Add the intent, REQ-109, TC-509, the views and the failing TC-509.
3. Add `src/demoOnce.ts`, use it in Projects.tsx and store.ts so TC-509 passes.
4. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- Real projects must never be dropped: `keepOneDemo` only removes projects with `demo: true` (TC-509 checks a real project survives).
- Which demo copy is kept: the first in the list = the most recently added (`addProject` prepends), so edits made in the latest copy stay.
- Onboarding already reuses the demo project; unchanged.

## Proof
- `npm test` incl. TC-509 (fails before the code change).
- Manual: click "Open demo project" twice → the list shows one "Travel Journal"; reload with two saved copies → one remains.
