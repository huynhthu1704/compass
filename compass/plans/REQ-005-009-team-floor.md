# Plan: REQ-005 … REQ-009 Team floor

Feature: F-009 · Requirements: REQ-005, REQ-006, REQ-007, REQ-008, REQ-009 · Test cases: TC-005 … TC-013
Intent: compass/intent/2026-11-26-agent-team-floor.md · Design: compass/design/F-009.md (Figma SCR-1 … SCR-4) · Decision: ADR-003

## Files
- compass/plans/REQ-005-009-team-floor.md — this plan (first commit)
- src/teamFloor.ts — pure logic, no React and no I/O: `computeFloor(project, featureFilter, now)` turns the run trace that
  Compass already records into the floor: the seven desks (agent, role, state, feature, bubble, run id), the summary counts,
  the approval list, the activity list and the recent handoffs (forward after an approval, back after a blocked review)
- src/pages/TeamFloor.tsx — the page: header with Live badge, feature filter and Pause motion; summary chips; the floor
  (desks in pipeline order, corridor, Your approval desk, moving handoff cards); the live activity list (aria-live polite);
  phone layout with an approval banner, a 2-column desk grid and a collapsed activity list
- src/App.tsx — route `/p/<id>/floor` and the sidebar item "Team floor" (with the waiting count)
- src/index.css — Team floor styles using only design tokens (honey design system); motion only inside
  `@media (prefers-reduced-motion: no-preference)` and never when the floor has the `paused` class
- tests/teamFloor.test.mjs — TC-005, TC-006, TC-012 and the automatable parts of TC-007 … TC-011 against `computeFloor`
  (Node 22 runs the .ts module directly; it imports types only)
- compass/spec.json + generated views (requirements.md, features.md, features/F-009.md, handover.md) — REQ-005…009 In build

## Steps
1. Commit this plan.
2. Write tests/teamFloor.test.mjs (fails: no src/teamFloor.ts yet), then src/teamFloor.ts until it passes. Rules:
   - Desk state from the agent's latest run (after the feature filter): running → Working, awaiting-approval → Waiting for you,
     approved/done → Done, failed/rejected → Rework, no run → Idle. The bubble is the latest step title.
   - The Review agent has no runs of its own: it works inside the Coding agent's run. Its desk is Working while the Coding run's
     latest step is a guardrail or eval step, Done once the change set has guardrail results, and the Coding desk shows Rework
     (the card goes back along the coral path) when a guardrail blocks the change set.
   - The Release agent has no runs either: its desk is Done when a release includes the feature (or, with "All features",
     when the latest release is newer than every run), otherwise Idle.
   - Handoffs: an "Approved by human reviewer" step in the last 4 s → card from that agent to the next agent in the pipeline;
     a blocking guardrail step in the last 4 s → card from Review back to Coding.
3. Build src/pages/TeamFloor.tsx from the approved design and add the route + sidebar item in src/App.tsx.
   Desks are buttons that open the agent's latest run (the same RunView as Agent runs, so approve/reject behave the same);
   "Review & approve" opens the waiting run.
4. Styles in src/index.css with tokens only (TC-017 still passes); a 1 s ticker only re-computes recent handoffs, no network.
5. Run `npm test`, `node compass/check-spec.mjs`, `npm run build`; Playwright screenshots of the floor in demo mode
   (light/dark, 1440 and 390 px, reduced motion) and a manual run of an agent to see bubbles and a handoff.
6. Set REQ-005…009 to In build; regenerate the views with the portal's specFiles().

## Risks
- **Showing the wrong state:** all rules live in one pure function with tests per status; the page only renders its result.
- **Extra cost or requests (REQ-009):** the page reads the in-browser store only; no fetch, no Claude call, no new dependency.
  TC-011's network check is done in the browser with Playwright.
- **Motion sickness / distraction:** movement only with `prefers-reduced-motion: no-preference` and when not paused.
- **Approvals behaving differently (REQ-008):** the floor never approves by itself; it opens the same run page as Agent runs.
- **Review and Release desks have no runs of their own:** the rules above are written down here and tested.
- **File limit:** 11 files including this plan and the generated views.

## Proof
- `npm test`: TC-005, TC-006, TC-012 and the computable parts of TC-007, TC-008, TC-009, TC-010 pass, plus all earlier tests.
- `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main` and `npm run build` pass.
- Screenshots: desktop and phone, light and dark, reduced motion; a demo agent run showing the bubble update and a handoff.
- TC-011: Playwright records no network request made by the Team floor while it is open.
