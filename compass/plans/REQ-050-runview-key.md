# Plan: REQ-050 Quotes stay with the run they were taken from

Feature: F-020 · Requirements: REQ-050 (quotes), REQ-053 (version being read) · Test cases: TC-216 (new, automated)
Intent: compass/intent/2026-11-27-quote-and-ask-agent.md · Design: compass/design/F-020.md (unchanged)
Found by the independent review of #69 (APPROVE with nits on 6887972).

## Files
- compass/plans/REQ-050-runview-key.md — this plan (first commit)
- tests/conversation.test.mjs — TC-216: every place that renders a RunView gives it `key={…id}`, so its local state
  (quotes, message, version being read, compare) belongs to one run (second commit, fails before the fix)
- src/components/AgentBox.tsx, src/pages/Build.tsx, src/pages/Runs.tsx — `key` on RunView (third commit)
- compass/spec.json + views (requirements, tests, handover, features/F-020) — TC-216 added after #76 merged; the test
  file header and the TC-204 test name follow #76 (live parts are TC-214/TC-215)

## Steps
1. Commit this plan.
2. Commit the failing test.
3. Add the keys; `npm test`, `npm run build`, guardrails; browser check: quote in a run in the agent box, start a new run
   from the same box, the reply box of the new run is empty.

## Risks
- **Lost draft:** switching to another run now clears an unsent quote of the run you left (it was never sent). That is the
  point of the fix: a quote must never be applied to a different run.
- **Remounting:** RunView is remounted only when the run id changes, not on every update of the same run.

## Proof
- `npm test` passes with TC-216; it fails on main.
- Browser check in a demo project (requirements agent box): quote, run again, the new run's reply box is empty.
