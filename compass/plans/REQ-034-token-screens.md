# Plan: REQ-034 Every project screen uses the project token; "missing token — ask an Admin"

Feature: F-015 · Requirements: REQ-034 (AC2 on every screen, AC4 missing and expired) · Test cases: TC-068
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-3) · Decision: ADR-011

Fifth build step of F-015, finishing REQ-034 after #97: the screens that still read the device token (agent run
approval text, Delete feature, Knowledge, Overview, Build) use `tokenFor(p)`, and a signed-in person with no token gets
"The project's GitHub token is missing or expired — ask an Admin" instead of "Connect GitHub first". Also the #97 review
nits. Opening a shared project on a new device follows in its own PR. Still off on the live site.

## Files
- `compass/plans/REQ-034-token-screens.md` — this plan
- `src/team.ts` — `missingTokenMessage(signedIn)` (pure, AC4 wording)
- `src/harness.ts` — install framework / commit spec / pull spec: the missing-token message
- `src/components/RunView.tsx`, `src/components/DeleteFeatureDialog.tsx`, `src/pages/Knowledge.tsx`,
  `src/pages/Overview.tsx`, `src/pages/Build.tsx` — `tokenFor(p)` and the missing-token message
- `src/pages/Team.tsx` — "Test" on a pasted token says "This token is not valid or has expired"; the masked token is
  read as "Token ending in 1234" (sr-only)
- `src/firebase.ts` — a project-token load that finishes after sign-out / account switch is dropped
- `tests/team.test.mjs` — `missingTokenMessage` (TC-068 second clause)
- `compass/spec.json` — REQ-034 In build; TC-068 Pass

## Steps
1. Plan (first commit). 2. Pure message + test. 3. Screens and harness. 4. Nits. 5. Checks, emulator run, PR.

## Risks
- With sign-in off nothing changes: `tokenFor` returns the device token and the message stays "Connect GitHub first".
- Missing a screen → `grep githubToken src` lists only the device-token pages (Connections, Import, New project,
  Projects), which create or import repos with the person's own account on purpose.

## Proof
- `npm test` (TC-068 both clauses), `npx tsc -b`, `npm run build`, `node compass/check-spec.mjs`, `npm run test:rules`.
- Emulator run: a BA with only the project token sees "Approving commits … opens a pull request" and Overview's sync
  buttons enabled; with no project token, the missing-token message.
