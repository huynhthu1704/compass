# Plan: REQ-040 One shared "Leave demo" action

Feature: F-015 · Requirements: REQ-040 (AC4) · Test cases: TC-077, TC-528 (unchanged)
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-7; no visible change)

## Why
Review nit on huynhthu1704/compass#144: `leaveDemo(); go('/')` is written out in three places (the demo banner, the
account menu and the demo role screen). If one changes, the others can drift apart, and leaving the demo should always
do the same thing (REQ-040 AC4).

## Files
- src/App.tsx — export `exitDemo()` next to `go` (`leaveDemo()`, then `go('/')`); the demo banner uses it
- src/components/Sidebar.tsx — the account menu's "Leave demo" uses `exitDemo`
- src/pages/Onboarding.tsx — the role screen's "Leave demo" uses `exitDemo`

## Steps
1. Commit this plan.
2. Add `exitDemo` and use it in the three places; drop the now-unused `leaveDemo` imports.
3. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- A pure refactor: same calls in the same order. The Back-button listener in App.tsx keeps calling `leaveDemo()` alone,
  because the person is already navigating; it must not also go to `/`.

## Proof
- `npm test` and `npm run build` pass unchanged; `grep "leaveDemo(); go('/')" src` finds only `exitDemo`.
- TC-077 (manual) still describes the behaviour: "Leave demo" in the banner, the account menu and the role screen.
