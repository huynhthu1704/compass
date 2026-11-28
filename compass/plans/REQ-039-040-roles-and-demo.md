# Plan: REQ-039, REQ-040 Roles come from the team; the demo only after sign-in

Feature: F-015 · Requirements: REQ-039 (AC1–AC3), REQ-040 (AC1–AC4) · Test cases: TC-075, TC-076, TC-077 (manual)
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-2, SCR-3, SCR-7) · ADR-014

Eighth build step of F-015. With sign-in on, the "What's your role?" screen is never the way in: roles come from the
team, and the sidebar shows "My roles: …" read-only on a real project. A signed-in person can open the demo — from the
no-access screen, or from the sidebar when on a team — pick a demo role on the existing role screen and use the sample
projects only, with a "Demo" banner and "Leave demo". The demo is not reachable before sign-in (Product Owner,
2026-11-27). Sign-in off: role screen and role picker as today. Still off on the live site.

## Files
- `compass/plans/REQ-039-040-roles-and-demo.md` — this plan
- `src/team.ts` — `startScreen(...)` (pure): loading / sign-in / no-access / role picker / app
- `src/firebase.ts` — `session.demo`, `enterDemo`, `leaveDemo` (sign-out ends the demo); `canSeeProject` shows only demo
  projects in the demo
- `src/App.tsx` — `startScreen`; the demo banner with "Leave demo"
- `src/pages/Onboarding.tsx` — in the demo, Continue opens the sample project
- `src/pages/SignIn.tsx` — "Try the demo" on the no-access screen (SCR-2)
- `src/components/Sidebar.tsx` — "My roles: …" read-only on a real project; "Try the demo" / "Leave demo"; the role
  picker only without sign-in or inside the demo
- `src/components/RunView.tsx` — #99 note: a demo-mode run's button says "Approve", not "Approve & open PR"
- `tests/team.test.mjs` — `startScreen` (TC-075)
- `compass/spec.json` — REQ-039, REQ-040 In build; TC-075 Pass

## Steps
1. Plan (first commit). 2. `startScreen` + test. 3. Demo state, App, screens, sidebar. 4. Checks, emulator run, PR.

## Risks
- The demo must never touch Firebase or GitHub: demo projects have no repo, so `tokenFor`, gates and records do not
  apply (`gated` requires a repo and not demo); real projects are hidden while in the demo.
- The demo role must not leak into real work: leaving the demo clears it; gates never use the role picker.
- Sign-in off: `startScreen` returns the role picker or the app exactly as before.

## Proof
- `npm test` (TC-075 `startScreen`), `npx tsc -b`, `npm run build`, `node compass/check-spec.mjs`, `npm run test:rules`.
- Emulator run: a person on no team → no-access → Try the demo → role screen → QA → sample project with the banner and
  only the test-case gate enabled → Leave demo → no-access again; a BA on a team sees "My roles: BA" and no role screen.
