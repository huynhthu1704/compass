# Plan: REQ-011 align the status labels in agent run lists

Feature: F-010 · Requirements: REQ-011 · Test cases: existing REQ-011 tests
Intent: compass/intent/2026-11-26-honey-brand.md · Design: compass/design/F-010.md

## Files
- src/index.css — new `.run-status` class: a fixed-width status column
- src/pages/Overview.tsx — wrap the status chip of "Recent agent runs" in `.run-status`
- src/pages/Feature.tsx — same for "Agent runs for this feature"

## Steps
1. Add `.run-status { flex: none; width: 136px; display: flex; }` next to `.option` in src/index.css.
2. Wrap the run status Badge in both run lists with `<span className="run-status">`.

## Risks
- A longer status text could overflow the column: the longest status today is "awaiting approval" (about 124 px), which fits in 136 px.
- Only layout changes; no data or behaviour changes.

## Proof
- Screenshot of the Overview page in demo mode with approved / failed / running / done / awaiting approval rows: agent name and goal start at the same x position in every row.
- `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs main` pass.
