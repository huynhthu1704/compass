# Plan: REQ-060, REQ-061, REQ-062 Approval details on the Team floor

Feature: F-009 · Requirements: REQ-060, REQ-061, REQ-062 (amend REQ-008 AC1, REQ-009 AC2) · Test cases: TC-300 … TC-309, TC-009, TC-012
Intent: compass/intent/2026-11-27-approval-details.md · Design: compass/design/F-009.md SCR-5 … SCR-7 · Issue: #38

## Files
- compass/plans/REQ-060-062-approval-details.md — this plan (first commit)
- src/teamFloor.ts — each `Approval` gains `waitingSince` (the run's `finishedAt`, which the harness sets when the run starts
  waiting; `startedAt` as a fallback), `wait` ("now" under a minute, then whole minutes "6m", hours "2h", days "2d" — rounded
  down, so 90 minutes is "1h"), `proposal` (a short summary from the run's proposal and change set) and `checks` (guardrail and
  evaluation results). Approvals are sorted by `waitingSince`, longest-waiting first; `approvalsShown` holds the first 3 and
  `approvalsMore` the rest count
- src/pages/TeamFloor.tsx — desk and phone banner list `approvalsShown` (agent · feature, waiting time, one-line goal, "blocked")
  and "+N more → Agent runs"; clicking an item opens the details panel (`role="dialog"`, Escape / outside click / Close, focus
  goes back to the item); its only actions are "Open run to approve" ("Open run · blocked") and Close
  (found while checking in the browser: on the narrow desktop desk the item header is cut at the end, so it reads
  "F-004 · Ideation" — feature first — instead of the Figma "Ideation · F-004", so the feature id stays visible)
- src/pages/Runs.tsx — `?status=awaiting-approval` shows only waiting runs, with "Show all runs"
- src/index.css — desk items, banner list and the panel (tokens only; full screen below 720 px)
- tests/teamFloor.test.mjs — TC-300, TC-302, TC-303, TC-306, TC-309 and the amended TC-012 test
- compass/spec.json + generated views (requirements.md, features.md, features/F-009.md, handover.md) — REQ-060…062 In build

## Steps
1. Commit this plan.
2. Write the tests (they fail on today's code), then `computeFloor` until they pass.
3. Build the desk, banner and panel in TeamFloor.tsx and the filter in Runs.tsx, following SCR-5 … SCR-7.
4. `npm test`, `npm run build`, Playwright in demo mode with 6 waiting runs: desk and banner show 3 + "+3 more", the link filters
   Agent runs, the panel opens and closes (Escape, outside click, Close) and "Open run to approve" opens the run page;
   1440 / 390 px, light and dark; no sideways scrolling.
5. Set REQ-060…062 to In build; regenerate the views.

## Risks
- **Approving outside the run page (REQ-008):** the panel only navigates; TC-309 checks that TeamFloor.tsx calls no approve or
  reject function.
- **Wrong order or waiting time:** TC-300 and TC-302 use runs whose start and waiting times differ.
- **Keyboard and screen readers:** the panel is a labelled dialog that closes on Escape and returns focus to the item.
- **File limit:** 11 files including this plan and the generated views.

## Proof
- `npm test` (new and earlier tests), `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build`.
- Screenshots of SCR-5 … SCR-7 equivalents in the built app (desktop and phone), compared with the Figma frames.
