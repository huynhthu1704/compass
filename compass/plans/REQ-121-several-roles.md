# Plan: REQ-121 Pick several roles on "What's your role?"

Feature: F-015 · Requirements: REQ-121 · Test cases: TC-527
Intent: compass/intent/2026-11-28-several-roles.md · Design: compass/design/F-015.md (SCR-7, updated; ADR-025)

## Files
- src/types.ts — `Settings.roles` (the picked roles); `role` stays only to read what older browsers saved; pure helpers `ROLE_ORDER`, `pickedRoles` and `toggleRole`
- src/pages/Onboarding.tsx — the role cards toggle (aria-pressed per card), Continue needs at least one, saves `roles`
- src/components/Sidebar.tsx — the single role dropdown becomes a "Demo roles: PO, BA ▾" checkbox menu (`<details>` inside the existing `account-role` row, so TC-510 still holds), the last ticked role cannot be unticked; Escape or a click outside closes it; the demo chip lists every role
- src/App.tsx — `hasRole` reads `pickedRoles`
- src/firebase.ts — entering, leaving the demo and signing out clear both `roles` and the old `role`
- src/designLinks.ts — `Viewer.roles`; `isDesignAdmin` is true when PO is among the picked roles
- src/pages/Design.tsx, src/pages/ProjectSettings.tsx — pass the picked roles; the design approval names the picked role that owns the gate (UX or PO)
- compass/spec.json — REQ-121, TC-527, ADR-025, SCR-7 elements
- tests/designLinks.test.mjs — TC-527 (next to TC-502, whose source check now reads `roles`; one test file keeps the change within 12 files)

## Steps
1. Commit the intent, REQ-121, TC-527, ADR-025, the SCR-7 update and this plan.
2. Add the helpers and the `roles` setting; switch every reader of `settings.role` to `pickedRoles`.
3. Multi-select on the onboarding screen; the checkbox menu in the sidebar.
4. TC-527 tests; `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs main`, `npm run build`; screenshots.

## Risks
- A browser that saved one `role` before this change would see the role screen again → `pickedRoles` falls back to the old `role`, and every write clears it.
- The demo roles leaking into real work → enterDemo, leaveDemo and sign-out clear both fields (REQ-040 AC2/AC4); TC-527 checks the source.
- Unticking every role in the sidebar would leave a person with no role → `toggleRole(..., keepOne)` refuses it and the last checkbox is disabled.

## Proof
- `npm test` TC-527 (helpers, `isDesignAdmin` with several roles, wiring in Onboarding, Sidebar, App and firebase)
- Screenshots of "What's your role?" with two roles picked and the sidebar checkbox menu open
