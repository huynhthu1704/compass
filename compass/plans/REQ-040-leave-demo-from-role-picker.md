# Plan: REQ-040 Leave the demo from the "What's your role?" screen

Feature: F-015 · Requirements: REQ-040 · Test cases: TC-528 · Decision: ADR-026
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-7; no new screen — the role
screen gets the "Leave demo" button the demo banner already has)

## Bug
"Open demo project" starts the demo session (ADR-022), which clears the role, so App renders the role picker in place
of every route until a role is picked (`startScreen` → `'role-picker'`). The browser Back button changes the hash, but
the same screen comes back, and "Leave demo" lives in the banner that the role picker hides: the only ways out are
picking a role or reloading. REQ-040 AC4 (leave the demo → back to your projects) cannot be reached.

## Files
- compass/spec.json — TC-528 for REQ-040, ADR-026 (the Product Owner's choice in chat, 2026-11-28)
- src/team.ts — pure `routeOf(hash)` and `leavesDemoOnNavigate(...)`: in the demo, with no role yet, a route other
  than the one the demo was opened on leaves the demo
- src/firebase.ts — `Session.demoEntry`; `enterDemo(entry)` records the route, `leaveDemo` clears it
- src/demoOnce.ts — `openDemo` passes `/p/<demo id>` to `enterDemo`
- src/App.tsx — a `hashchange` listener calls `leaveDemo()` when `leavesDemoOnNavigate` says so
- src/pages/Onboarding.tsx — "Leave demo" button next to Continue, only in the demo
- tests/demoOnce.test.mjs — TC-528 cases

## Steps
1. Commit this plan, TC-528 and the failing TC-528 cases.
2. Add the rule, record the entry route, wire the listener and the button; add ADR-026.
3. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- "Open demo project" sets the hash right after `enterDemo`; that `hashchange` lands on the entry route, so it must
  not leave the demo — the entry is `/p/<demo id>`, recorded before `go`, and TC-528 checks it.
- Picking a role (Continue) navigates too; with a role set, the rule never leaves the demo.
- After a role is picked, Back moves inside the demo as before; "Leave demo" stays in the banner and the sidebar.

## Proof
- `npm test` incl. TC-528 (fails before the code change).
- Manual: signed in, Projects → "Open demo project" → role screen → browser Back → Projects, demo left; again →
  "Leave demo" on the role screen → Projects.
