# Plan: REQ-030, REQ-031, REQ-032, REQ-035, REQ-038 Team page

Feature: F-015 · Requirements: REQ-030, REQ-031, REQ-032 (AC2: account card and Sign out), REQ-035, REQ-038 (AC1:
baseline with the first team) · Test cases: TC-060 … TC-063 (team logic, extended), TC-073 (baseline part), TC-069 /
TC-070 manual
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-3, SCR-6)

Third build step of F-015: the Team page where the super admin creates a project's first team and Admins add people
with roles, change roles and remove people; the sidebar gets the Team item and the signed-in account. Still off on the
live site (no `VITE_FIREBASE_CONFIG` there yet). The project GitHub token card (REQ-034) follows in the next PR.

## Files
- `compass/plans/REQ-030-031-035-team-page.md` — this plan
- `src/team.ts` — pure helpers: `teamDoc` (team → Firestore document: members, admins, roles without Admin),
  `membersFromDoc` (document → team, Admin from `admins` only), `baselineFrom` (approvals already in spec.json:
  approved designs and requirements past Draft)
- `src/firebase.ts` — `loadTeam`; `changeTeam` applies one change (add / set roles / remove, `applyTeamOp` in
  `src/team.ts`) to the team as saved, in a Firestore transaction; the first change creates the team with
  `baseline/initial` (REQ-038 AC1); reuse `membersFromDoc` when loading access; dev-only emulator connection
- `src/sidebar.ts` — `teamLink`, `signedInCard`
- `src/components/Sidebar.tsx` — Team item for Admins and the super admin; account card with the Google email; Sign out
- `src/pages/Team.tsx` — SCR-3 / SCR-6: Add person (email + role checkboxes), team list with Edit roles / Remove, the
  last-Admin rule, the "replace the token" reminder after a removal, "No team yet" for the super admin
- `src/App.tsx` — route `/p/<id>/team`
- `tests/team.test.mjs`, `tests/sidebar.test.mjs` — the new helpers

## Steps
1. Plan (first commit).
2. Pure helpers + tests.
3. Firebase helpers, Team page, sidebar, route.
4. Checks, screenshots with a stubbed session, PR.

## Risks
- Two Admins editing at once (or a page opened earlier): each change is applied to the team as saved now, in a
  transaction, so a stale page cannot undo another change (found by the first review, fixed, checked with the emulators).
- The baseline stores design and requirement approvals only: those are the only approvals `spec.json` records today
  (`features[].design.approvedBy`, requirement status). The flagging PR (REQ-038 AC2) flags those two gates.
- The first team must name an Admin (rules refuse otherwise): the page asks the super admin to tick Admin for at least
  one person before the first save.
- Projects without a GitHub repo (local, demo) have no team: the page says so.

## Proof
- `npm test` (new cases for `teamDoc`, `membersFromDoc`, `baselineFrom`, `teamLink`, `signedInCard`), `npm run
  test:rules` unchanged and passing, `npx tsc -b`, `npm run build`, `node compass/check-spec.mjs`.
- Screenshots of the Team page at 1280 px and 390 px.
