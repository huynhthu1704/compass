# Plan: REQ-032, REQ-033, REQ-035, REQ-037, REQ-038 Firebase sign-in and security rules

Feature: F-015 · Requirements: REQ-032, REQ-033, REQ-035, REQ-037, REQ-038 · Test cases: TC-065, TC-067
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md (SCR-1, SCR-2, SCR-5)
Decisions: ADR-010, ADR-012, ADR-013

Second build step of F-015: Google sign-in, the "no access yet" screen and the Firestore security rules that guard
teams, tokens, approval records, the approval baseline and the super admin list. **Sign-in stays switched off on the
live site** until the last F-015 PR adds `VITE_FIREBASE_CONFIG` to the deploy workflow (approved by the Product Owner),
so nobody is locked out before the Team page and the project token exist. Without that variable the portal works
exactly as today (REQ-032 AC5).

## Files
- `compass/plans/REQ-032-035-037-firebase-signin.md` — this plan
- `package.json`, `package-lock.json` — add the `firebase` library (dependency change → `human-approved` label);
  script `test:rules` runs the rules tests in the Firestore emulator
- `firestore.rules` — new: the security rules the Product Owner publishes in the Firebase console
- `firebase.json` — new: points the emulator at `firestore.rules` (used only by `npm run test:rules`)
- `src/firebase.ts` — new: reads `VITE_FIREBASE_CONFIG`; Google sign-in / sign-out; loads the signed-in person's
  projects and roles; records the super admin at first sign-in (ADR-013)
- `src/pages/SignIn.tsx` — new: SCR-1 "Sign in to Compass" and SCR-2 "You have no access yet" (Try the demo comes
  with REQ-040)
- `src/App.tsx` — show sign-in / no-access before the portal when Firebase is configured; hide projects the person
  has no access to
- `tests/firestoreRules.test.mjs` — TC-067 in the emulator (skipped by `npm test` when no emulator is running) and a
  check that the gate table in `firestore.rules` equals `GATE_ROLES` in `src/team.ts` (always runs)
- `compass/spec.json` — statuses

## Data in Firestore
- `config/access` `{ superAdmins: [email] }` — created once by the super admin's account (hash in the rules).
- `projects/{owner__repo}` `{ name, repo, members: [email], admins: [email], team: { email: [roles] } }`.
- `projects/{id}/baseline/initial` `{ approvals: [...] }` — created only with the first team, never changed.
- `projects/{id}/approvals/{auto}` `{ items, gate, email, role, at }` — append-only.
- `projects/{id}/secrets/token` `{ token }` — members read, Admins write (used by the token PR, REQ-034).

## Steps
1. Plan (first commit).
2. `firestore.rules`: verified email only; super admin from `config/access`; first team (with its baseline) only by the
   super admin; team and token writes by Admins or the super admin, at least one Admin; approval records bound to the
   signer's email and a role they hold that owns the gate, or "super admin"; records and baseline never change.
3. Rules tests in the emulator (TC-067) + the gate-table check.
4. `src/firebase.ts`, `src/pages/SignIn.tsx`, `src/App.tsx`.
5. Statuses, checks, PR with the `human-approved` label.

## Risks
- The live site must not change yet → no deploy-workflow change in this PR; without the variable the code path is off.
- Rules and `src/team.ts` could drift → the gate-table test compares them.
- The super admin email must not be in the repo → only its SHA-256 hash is in `firestore.rules`; the tests replace it
  with a test email's hash.
- `firebase` adds bundle size → only `firebase/app`, `firebase/auth` and `firebase/firestore` are imported, loaded
  only when Firebase is configured.

## Proof
- `npm run test:rules` (emulator): TC-067 cases pass. `npm test`: gate-table check, all other tests.
- `npx tsc -b`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.
- Manual (TC-065) once the Product Owner publishes the rules and the deploy line is added in the last PR.
