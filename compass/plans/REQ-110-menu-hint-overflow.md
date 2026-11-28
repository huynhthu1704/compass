# Plan: REQ-110 Account menu hint no longer overflows the menu

Feature: F-013 · Requirements: REQ-110 · Test cases: TC-510
Intent: compass/intent/2026-11-28-sidebar-account-menu.md · Design: compass/design/2026-11-28-account-menu.md

## Files
- compass/plans/REQ-110-menu-hint-overflow.md — this plan
- src/index.css — account menu items may wrap, so a long hint ("Not connected") moves to its own line, right-aligned, instead of running past the menu edge

## Steps
1. Commit this plan.
2. Add `flex-wrap: wrap; row-gap: 0` to `.account-menu button`; the hint keeps `white-space: nowrap` and `margin-left: auto`.
3. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, and a browser check of the demo account menu at the sidebar width.

## Risks
- The Dark theme switch also uses `margin-left: auto`; it is short and must stay on the label's line.

## Proof
- Browser: in the demo, the account menu's "Connections · Not connected" stays inside the menu.
- `npm test`, build, check-spec and guardrails OK.
