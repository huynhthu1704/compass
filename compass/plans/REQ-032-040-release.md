# Plan — F-015 release: sign-in on for the live site, plus the leftover review notes

Requirements: REQ-032, REQ-033, REQ-034, REQ-038, REQ-040 (F-015 team access).
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md · Decisions: ADR-010…ADR-014.

## Why
F-015 is built and merged, but the live site is built without a Firebase config, so sign-in stays off.
This PR turns it on. It also closes the small findings that earlier reviews left for the release (#99, #100, #103, #104).

## Files (10)
- `.github/workflows/deploy.yml` (protected path; the Product Owner approved this one line in chat, and the PR needs the
  `human-approved` label): the build step gets `env: VITE_FIREBASE_CONFIG: ${{ vars.FIREBASE_CONFIG }}`. The config is a
  repository variable, not a secret, because the Firebase web config is public by design. Access is enforced by
  `firestore.rules`.
- `src/approvals.ts` (#100): approvals fail closed. With Firebase configured, a real project needs a signed-in
  person, so a gate is never passed while signing in or loading.
- `src/pages/Idea.tsx`, `src/pages/Tests.tsx` (#104, REQ-038 AC2): "Unconfirmed — claims …" badges on the intent and on
  test cases.
- `src/pages/Projects.tsx` + `src/team.ts` (#99): opening a shared project:
  - stops if the person signs out (or switches account) meanwhile;
  - refuses a repository that GitHub reports under another owner/name (renamed or moved), with "ask an Admin";
  - says "The project's GitHub token cannot reach owner/name — ask an Admin of the project" on 404.

  The messages come from a pure helper in `src/team.ts`.
- `src/firebase.ts` (#103): one import from `./team` instead of two.
- `tests/team.test.mjs`: tests for the new helper and the fail-closed rule; the reuse test is named "TC-072 (part)".
- `compass/spec.json`: TC-076's gherkin narrowed to what its test checks (project visibility in the demo).
- this plan.

## Steps
plan → pure helpers + tests → pages → workflow line → checks → emulator run → review → the PO's yes → merge →
the deploy runs → the PO signs in first on the live site (becomes super admin, ADR-013) → teams are created.

## Risks
- **Turning sign-in on changes the live site for everyone:** every visitor sees "Sign in to Compass" first, and the demo is only
  reachable after sign-in (REQ-040). That is the agreed behaviour.
- **Wrong or missing `FIREBASE_CONFIG` variable:** `readConfig` returns null, so the site behaves as today (sign-in off).
  Nothing breaks, but it would not be released. After the deploy, check that the live page shows the sign-in screen.
- **Authorized domain:** sign-in fails with `auth/unauthorized-domain` unless the live domain is in Firebase Auth's
  authorized domains. The PO added it earlier; re-checked after deploy.
- **Firestore rules:** they are the security boundary and are already published (the PO confirmed they match the repo).
- **Left out (low value, follow-up issue):**
  - a 401 hint by token source (today's hint already names both sources);
  - the Status-field hint on non-Draft rows;
  - Connections/autosync in the demo;
  - an intent with no approver;
  - caching approval reads.

## Proof
- `npm test`, `npx tsc --noEmit -p .`, `npm run build`, `oxlint`, `node compass/check-spec.mjs`,
  `node compass/check-guardrails.mjs origin/main`, `npm run test:rules`.
- Emulator run with sign-in on:
  - a signed-in BA sees the Unconfirmed badge on a forged intent and test case;
  - opening a shared project with a 404 token shows the new message.
- After deploy, on https://huynhthu1704.github.io/compass/: the sign-in screen appears; the PO signs in and sees the projects
  list as super admin.
