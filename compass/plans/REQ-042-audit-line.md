# Plan — F-015 phase 1, build 2b of 3: the audit line on every commit and pull request

Requirement: REQ-042 (AC1, AC2). Intent: compass/intent/2026-11-27-project-creation-control.md · Design: none (commit
and pull request text only) · Decision: ADR-016.

## Why
Since build 2a (#135), everyone's GitHub work on team projects runs with the shared work token, so GitHub shows the token
owner's account on every change. The audit line puts the person who did it into the commit and pull request text.
Compass's approval records in Firebase stay the proof of an approval: the Firestore rules never see GitHub.

## Files (7)
- `src/team.ts` (pure, tested):
  - `auditLine(email, roles)` → "Made in Compass by <email> (<roles>)".
  - `withAudit(text, line)` adds the line once, at the end.
- `src/github.ts`:
  - `setAuditSource(fn)`;
  - `commit` and `createPR` add the line for the repository;
  - `mergePR` takes an optional commit message for the squash commit.
- `src/token.ts`: sets the audit source. With sign-in configured and the person signed in, outside the demo, the line
  names them with their roles on that project ("super admin" when they are a super admin with no team roles).
  Otherwise there is no line, so with sign-in off or in the demo messages are as today (AC2).
- `src/harness.ts`: after a gate is passed, the line names the role that passed it.
  - **Build run:** the commit and pull request use the approval record's "email (role)".
  - **Release:** the squash merges and the spec commit use the release approval.
- `src/firebase.ts` (short check of #135): when someone is removed from every team, notify the listeners, so the menu
  and pages redraw at once.
- `tests/team.test.mjs`: TC-081.
- `compass/spec.json`: REQ-042 In build, TC-081 Pass.
- This plan.

## Steps
plan → helpers + test → github/token/harness → checks → review → the Product Owner's yes → merge.

## Risks
- **The emails become part of GitHub history,** public in public repositories (the Product Owner chose the email, ADR-016).
- **Not proof:** someone holding the work token can commit on GitHub without Compass, so the line proves nothing; the
  approval records do.
- **Commits made before this change** have no line.

## Proof
- `npm test` (TC-081: gate role, roles when no gate applies, super admin, nothing with sign-in off, the line added only
  once).
- `npx tsc --noEmit -p .`, `npm run build`, `oxlint`, `node compass/check-spec.mjs`,
  `node compass/check-guardrails.mjs origin/main`.
