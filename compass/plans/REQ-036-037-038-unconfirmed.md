# Plan: REQ-036, REQ-037, REQ-038 Unconfirmed approvals; approvedBy everywhere; a retry reuses its record

Feature: F-015 · Requirements: REQ-036 (AC1 for intent, test cases and releases), REQ-037 (AC4: a retry reuses the
record), REQ-038 (AC2–AC4) · Test cases: TC-073, TC-074 (manual) · Intent: compass/intent/2026-11-27-team-access.md
Design: compass/design/F-015.md (SCR-4) · Decision: ADR-012

Last feature step of F-015 before the release PR. Approvals in spec.json that have neither a Firebase approval record
(same item, gate, email and role) nor a place in the project's baseline are flagged: a red "Unconfirmed" badge naming
who they claim, on the requirement and the design, and a notice on the Feature board with links. Only with sign-in on,
outside the demo, on a project with a team. Also: intent, test-case and release approvals carry "<email> (<role>)" in
spec.json; approving an agent run again after a failure reuses its record. Still off on the live site.

## Files
- `compass/plans/REQ-036-037-038-unconfirmed.md` — this plan
- `src/team.ts` — `parseApprovedBy`, `unconfirmedApprovals(spec, evidence)` (pure)
- `src/types.ts` — `Idea`, `TestCase`, `ReleaseRec`: `approvedBy`/`approvedAt`; `Run.approval` (record id + text)
- `src/firebase.ts` — `writeApprovalRecord` returns the record id; `loadApprovalEvidence(key)` (baseline + records)
- `src/approvals.ts` — `recordApproval` returns `{ text, id }`; `useUnconfirmed(p)`
- `src/harness.ts` — `approveRun` reuses `run.approval` on a retry; sets approvedBy on the idea (intent) and on the test
  cases of a test-design proposal; `release()` stores approvedBy on the release record
- `src/pages/Overview.tsx` — the Feature board notice (SCR-4 "1 approval is not confirmed by Firebase")
- `src/pages/Requirements.tsx`, `src/pages/Design.tsx` — the Unconfirmed badge; `recordApproval` result shape
- `tests/team.test.mjs` — TC-073 (`unconfirmedApprovals`)
- `compass/spec.json` — REQ-036, REQ-038 In build; TC-073 Pass

## Steps
1. Plan (first commit). 2. Pure check + test. 3. Types, Firebase, approvals hook. 4. Harness and pages. 5. Checks,
emulator run, PR.

## Risks
- Loading records costs Firestore reads (one per project open; a small team makes few approvals) — free plan limits
  are far above this.
- The baseline covers requirement and design approvals (the only ones spec.json recorded before team access); intent,
  test-case and release approvals made after team access always have records, so the check covers the same two gates.
- Sign-in off, demo, local projects, or a project without a team → no check, no badge.

## Proof
- `npm test` (TC-073: baseline match, record match on item / gate / email / role, wrong role, no baseline, backdated),
  `npm run test:rules`, `npx tsc -b`, `npm run build`, `node compass/check-spec.mjs`.
- Emulator run: a requirement approved in the portal shows no badge; one edited in spec.json to "ux@example.com (UX)"
  shows "Unconfirmed — claims ux@example.com (UX)" and the Feature board notice lists it.
