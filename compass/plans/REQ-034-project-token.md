# Plan: REQ-034 One GitHub token per project, used by its members

Feature: F-015 · Requirements: REQ-034 (AC1–AC4), REQ-031 AC4 · Test cases: TC-068, TC-069 (manual)
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-3 token card, SCR-6)
Decision: ADR-011 (shared token per project, accepted risk)

Fourth build step of F-015: the project's Admins save one GitHub token on the Team page; signed-in members use it for
that project's GitHub work without connecting their own. Still off on the live site. The remaining screens that read
the token (Release, Knowledge, Build, Overview, Delete feature) and opening a shared project on a new device follow in
the next PR, to stay within 12 files.

## Files
- `compass/plans/REQ-034-project-token.md` — this plan
- `src/team.ts` — `pickToken` (pure): with sign-in on, the project token wins over the person's own token
- `src/firebase.ts` — `loadProjectToken`, `saveProjectToken`, an in-memory cache and `useProjectToken`
- `src/token.ts` — new: `tokenFor(project)` used by every GitHub write path
- `src/autosync.ts`, `src/followUp.ts`, `src/harness.ts` — use `tokenFor(p)` instead of the device token
- `src/App.tsx` — load the project token when a project opens; the sync label uses `tokenFor(p)`
- `src/github.ts` — a 401 says the token is missing or expired and, with team access, to ask a project Admin (AC4)
- `src/pages/Team.tsx` — the token card (SCR-3): status, masked value, Test, Replace, fine-grained token help; plus the
  two #94 review nits (show "your last change was not saved"; loading state when the session arrives late)
- `tests/team.test.mjs` — `pickToken` (TC-068)

## Steps
1. Plan (first commit). 2. `pickToken` + test. 3. Firebase token helpers, `tokenFor`, write paths. 4. Token card and
nits. 5. Checks, end-to-end run with the emulators, PR.

## Risks
- A member's browser can read the token (ADR-011, accepted); the card never shows it to non-Admins and only shows the
  last 4 characters to Admins.
- A wrong token would break every member's GitHub work → "Test" checks it with GitHub before it is saved.
- With sign-in off nothing changes: `tokenFor` returns the device token.

## Proof
- `npm test` (TC-068 `pickToken`), `npm run test:rules` (secrets rules unchanged), `npx tsc -b`, `npm run build`.
- Emulator run: an Admin saves a token; a member (no own token) opens the project and `tokenFor` returns the project
  token; a non-Admin sees no token card.
