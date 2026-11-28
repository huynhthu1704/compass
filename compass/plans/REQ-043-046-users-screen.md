# Plan — F-015 phase 1, build 3a of 3: the Users screen, and project tokens closed

Requirements: REQ-043 (AC1, AC2), REQ-046 (AC1–AC3); REQ-031 AC4 as changed by REQ-043.
Intent: compass/intent/2026-11-27-project-creation-control.md · Design: compass/design/F-015.md (SCR-8, SCR-9) ·
Decisions: ADR-016, ADR-018.

## Why
Builds 1 and 2 moved GitHub access to the shared work token. Project tokens are no longer used, so this build:
- removes their card from the Team page;
- closes their Firestore rules;
- adds the super admins' Users screen, where the owner adds or removes super admins and old project tokens are deleted.

Build 3 is split in two to stay within 12 files; 3b limits project creation to super admins (REQ-044).

## Files (12)
- `firestore.rules`: `projects/{pid}/secrets/*`: no reads or writes; only a super admin's delete (REQ-043 AC2).
- `tests/firestoreRules.test.mjs`: TC-082. The old cases that still read or write project tokens are updated.
- `src/team.ts` (pure, tested):
  - `ownerOf(superAdmins)` — the first entry, the owner who created the list (ADR-013);
  - `withSuperAdmin(list, email, on)` — never removes the owner, keeps the owner first, no duplicates;
  - `peopleRows(teams, superAdmins)` — everyone on any team, plus super admins, with their projects and an "Owner" or
    "Super admin" badge, sorted with the owner first.
- `tests/team.test.mjs`: TC-087 (pure part) and TC-088 (pure part).
- `src/firebase.ts`:
  - `loadAllTeams()` for super admins;
  - the retired project-token code is removed (`loadProjectToken`, `saveProjectToken`, `useProjectToken`, …). The
    listeners that auto-sync and the pages use now fire only for the shared workspace.
- `src/pages/Users.tsx` (new, SCR-8):
  - a "People (n)" card with email, projects and badges;
  - a "Super admin" switch that only the owner can change; others see it read-only;
  - an "Old project tokens" card with "Delete old project tokens" and a reminder to revoke them on GitHub;
  - a notice to give super admin only to people you fully trust.
- `src/sidebar.ts`: `usersLink`.
- `src/components/Sidebar.tsx`: a "Users" item in the workspace group for super admins, signed in, outside the demo.
- `src/App.tsx`: the `/users` route; anyone else lands on Projects.
- `src/pages/Team.tsx` (SCR-9):
  - no project-token card;
  - after removing someone, the notice says to ask a super admin to replace the work token and key (REQ-031 AC4).
- `compass/spec.json`: REQ-043 and REQ-046 statuses; TC-082 Pass.
- This plan.

## Steps
plan → rules + emulator test → pure helpers + tests → firebase → Users, Sidebar, App, Team → checks → browser run with
the emulators → review → the Product Owner's yes → merge → the Product Owner publishes the rules.

## Risks
- **Publish the rules after the deploy.** Until then the old rules still let members read project tokens; nothing
  reads them any more since build 2a, so nothing breaks either way. Publishing before the deploy breaks nothing.
- **Owner = first entry of `config/access`.** The rules created the list with the owner alone, and Compass keeps the
  owner first on every change. The rules refuse any change by someone who is not the owner, whatever the screen shows.
- **Deleting old tokens does not revoke them on GitHub:** the screen says to revoke them there.
- **People on no team** are not listed. Super admins are listed even when they are on no team.

## Proof
- `npm run test:rules` (TC-082), `npm test` (TC-087 and TC-088 pure parts), `npx tsc --noEmit -p .`, `npm run build`,
  `oxlint`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.
- Browser run with the emulators:
  - the owner sees Users, makes a member super admin, and the member then sees Users with read-only switches;
  - a member without super admin has no Users link, and `#/users` shows Projects;
  - "Delete old project tokens" removes the stored token;
  - the Team page has no token card.
