# Plan: REQ-109 "Open demo project" works for signed-in people

Feature: F-015 · Requirements: REQ-109, REQ-040 · Test cases: TC-509 · Decision: ADR-022
Intent: compass/intent/2026-11-27-one-demo-project.md · Design: none (no new screen; the Projects page keeps its layout)

## Bug
With sign-in on, a signed-in person outside the demo who is not a super admin cannot see projects without a repo
(`projectVisible`, REQ-032). Clicking "Open demo project" added a hidden demo project and routed to `/p/<id>`, which
found nothing and fell back to the Projects page — the button seemed to do nothing.

## Files
- compass/spec.json — ADR-022 (the Product Owner's choice in chat), TC-509 text
- src/team.ts — pure `opensDemoSession(session)`: true for any signed-in person outside the demo (super admins too)
- src/pages/Projects.tsx — "Open demo project" / "Explore the demo" call `enterDemo()` first when needed, then open the demo project
- tests/demoOnce.test.mjs — TC-509 cases for `opensDemoSession`

## Steps
1. Commit this plan and the failing TC-509 cases.
2. Add `opensDemoSession`, use it in Projects.tsx, add ADR-022.
3. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- Entering the demo hides real projects until "Leave demo" (REQ-040 AC3) — that is the chosen behaviour (ADR-022).
- `enterDemo` clears the role, so the "What's your role?" screen shows first; the route `/p/<demo id>` stays, so the demo project opens after the role is picked.
- Super admins also go through the demo session (people sign in to view the demo). Only a build without Firebase config opens the demo project directly.

## Proof
- `npm test` incl. the new TC-509 cases (fail before the code change).
- Manual: signed in as a team member, click "Open demo project" → role picker → demo project with the demo banner.
