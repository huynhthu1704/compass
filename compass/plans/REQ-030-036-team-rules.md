# Plan: REQ-030, REQ-031, REQ-032, REQ-033, REQ-035, REQ-036 Team and gate rules

Feature: F-015 · Requirements: REQ-030, REQ-031, REQ-032, REQ-033, REQ-035, REQ-036 · Test cases: TC-060, TC-061, TC-062, TC-063, TC-064, TC-066, TC-071 (approvedBy text only)
Intent: compass/intent/2026-11-27-team-access.md · Design: compass/design/F-015.md

First build step of F-015: the rules of team access as plain functions, with no UI, no Firebase and no new
dependency, so the next steps (Firebase sign-in and security rules, Team page, gate buttons) share one tested source of
truth.

## Files
- `compass/plans/REQ-030-036-team-rules.md` — this plan
- `src/team.ts` — new, pure module (types-only imports): team roles, gate → role table, email normalisation and
  validation, add / change roles / remove a member (with the last-Admin rule and the replace-token reminder), which
  projects and roles a signed-in viewer gets, `canPass`, the "Needs the … role" hint and the `approvedBy` text
- `tests/team.test.mjs` — node:test, one test per TC id
- `compass/spec.json` — REQ-030, 031, 033, 035, 036 → In build; TC-060 … 064, 066 → Pass (TC-071 stays Not run: its build-run label and demo parts come with the gate buttons)

## Steps
1. Write this plan (first commit).
2. Add `src/team.ts`:
   - `TEAM_ROLES` = PO, BA, UX, QA, Dev, DM, Ops, Admin; `GATE_ROLES`: intent → PO; requirements → PO, BA;
     design → UX, PO; tests → QA; build → Dev; release → DM, PO; team → Admin (REQ-033 AC 1).
   - `normalizeEmail` (trim, lower case), `isEmail`.
   - `addMember`, `setRoles`, `removeMember` return `{ ok, team, error? }` and never change the input;
     refusal texts: invalid email, no role, already on the team, "A project needs at least one Admin".
     `removeMember` returns `replaceToken: true` (REQ-031 AC 4).
   - `accessFor(projects, viewer, superAdmins)`: verified email only; matched case-insensitively; super admin sees
     every project (REQ-032, REQ-035).
   - `canPass(gate, roles, isSuperAdmin)`, `gateHint(gate)` → "Needs the UX or PO role", `approvedBy(email, roles, gate)`
     → "ba@example.com (BA)" — the first of the person's roles that owns the gate (REQ-036).
3. Add `tests/team.test.mjs` for TC-060 … 064, 066, 071.
4. Update statuses in `compass/spec.json`; run the checks.

## Risks
- Role names must match the existing `Role` type in `src/types.ts` (PO, BA, DM, UX, Dev, QA, Ops) — `TeamRole` extends
  it with Admin instead of redefining it.
- These rules are repeated in the Firestore security rules (next PR); a test there will compare the two gate tables so
  they cannot drift.
- Nothing calls the module yet, so there is no user-visible change and nothing to roll back.

## Proof
- `npm test`: TC-060, TC-061, TC-062, TC-063, TC-064, TC-066 and the approvedBy part of TC-071 pass.
- `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main` pass.
