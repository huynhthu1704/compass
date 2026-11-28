# Plan: REQ-121 Tidy-up — regenerate the F-015 design view, drop the inline checkbox colour

Feature: F-015 · Requirements: REQ-121 (and REQ-042's design note) · Test cases: TC-527, TC-529
Intent: compass/intent/2026-11-28-several-roles.md · Design: compass/design/F-015.md

## Files
- compass/design/F-015.md — regenerated from `compass/spec.json` with the portal's own `designMd()` (src/framework.ts); it still described the old "Demo role: QA ▾" dropdown (review nit on #142)
- compass/spec.json — F-015 summary and SCR-7 purpose say "one or more roles"; REQ-042 gets `design: "none: …"`, as the F-015 notes already say it has no screen, so the coverage line stays clean
- src/components/Sidebar.tsx — the roles checkboxes drop their inline `accentColor`; the app-wide rule from #146 (REQ-010 AC4) makes them honey
- tests/designLinks.test.mjs — TC-527 matches the checkbox without the inline style

## Steps
1. Edit the spec text; regenerate F-015.md with `designMd()` loaded through Vite.
2. Remove the inline style and update TC-527.
3. `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build`; check in a browser that the roles checkboxes are still honey.

## Risks
- The sidebar checkboxes losing their colour → the global rule in src/index.css covers every checkbox (TC-529); checked in a browser (computed accent colour).
- A hand-edited generated file drifting from the generator → the file is produced by `designMd()` itself, not edited by hand.

## Proof
- `npm test` TC-527, TC-529; `node compass/check-spec.mjs`
- Computed `accent-color` of the sidebar roles checkboxes is #FFC629
