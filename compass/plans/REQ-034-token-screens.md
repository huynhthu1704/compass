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
- `src/token.ts` — `missingToken(p)`: the AC4 message (or "Loading the project token…") for a signed-in person on a
  real project with no usable token; null otherwise
- `src/pages/Release.tsx` — Release button disabled and the message shown when the token is missing
- `src/harness.ts` also: `approveRun` (code changes) and `release()` stop with that message before writing anything
  (first review of #98). The #97 nits for `src/pages/Team.tsx` and `src/firebase.ts` move to the next PR (file limit).
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
