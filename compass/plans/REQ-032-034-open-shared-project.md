# Plan: REQ-032, REQ-034 Open a shared project on any device; token-load and wording fixes

Feature: F-015 · Requirements: REQ-032 (AC2: the projects whose team lists me), REQ-034 (AC2, AC4) · Test cases: TC-064,
TC-068
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-3) · Decision: ADR-011

Sixth build step of F-015. A member signs in on a device that has none of the team's projects: the Projects page lists
the shared projects whose team names them and opens each one from GitHub with the project's shared token, the same way
Import does. Plus the review notes carried over from #97 and #98. Still off on the live site.

## Files
- `compass/plans/REQ-032-034-open-shared-project.md` — this plan
- `src/team.ts` — `sharedToOpen(access, localRepos)` (pure): shared projects not on this device yet
- `src/firebase.ts` — access entries carry the project's name and repo; a refused token load is remembered (so the
  page says "missing — ask an Admin", not "Loading…" for good); a load finishing after sign-out is dropped (#97 nit)
- `src/token.ts` — `missingToken` uses the failed-load state
- `src/pages/Import.tsx` — `importRepo(token, repo)` extracted, used by Import and by the Projects page
- `src/pages/Projects.tsx` — "Shared with you": name, my roles, Open (loads the project token, then imports)
- `src/components/RunView.tsx` — a demo-mode run on a real repo says no code is pushed (#98 nit)
- `src/pages/Team.tsx` — Test on an invalid pasted token: "not valid or has expired"; sr-only masked token (#97 nits)
- `tests/team.test.mjs` — `sharedToOpen`

## Steps
1. Plan (first commit). 2. `sharedToOpen` + test. 3. Access with name and repo; token-load state. 4. `importRepo`,
Projects page. 5. Carried-over fixes. 6. Checks, emulator run (open a shared project on an empty device), PR.

## Risks
- Opening uses the project token; without one the member reads the AC4 message and nothing is created locally.
- Two devices open the same repo → each gets its own local copy, as with Import today; the spec on GitHub stays the
  source of truth (autosync).
- Sign-in off → no "Shared with you" section; Import unchanged.

## Proof
- `npm test` (`sharedToOpen`), `npm run test:rules`, `npx tsc -b`, `npm run build`, `node compass/check-spec.mjs`.
- Emulator run: a BA signs in on an empty device, sees "Shared with you · Travel (BA)", clicks Open (GitHub answered by
  a Playwright route) and lands on the project; with no project token the AC4 message and no project is created.
