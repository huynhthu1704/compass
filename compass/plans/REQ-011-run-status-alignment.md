# Plan: REQ-011 line up agent-run status badges

Feature: F-010 · Requirements: REQ-011 · Test cases: existing REQ-011 test cases (visual polish, no behaviour change)
Intent: compass/intent/2026-11-26-honey-brand.md · Design: compass/design/F-010.md

## Files
- src/index.css — new `.run-status` class: a fixed 128px column for the status badge
- src/pages/Feature.tsx — wrap the run status badge in "Agent runs for this feature" with `.run-status`
- src/pages/Overview.tsx — same for "Recent agent runs"

## Steps
1. Add the `.run-status` class next to `.option`.
2. Wrap the status badge of each run row on the Feature and Overview pages.

## Risks
- "awaiting approval" is the longest status; 128px fits it at 12px type, so no wrapping. Badges keep `white-space: nowrap`.
- Phone width: the column takes 128px of the row; the goal text still wraps in the remaining space.

## Proof
- `npm test`, `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs main` pass.
- Screenshot of the Feature page in demo mode with runs "awaiting approval", "done", "rejected", "approved": agent names start at the same x position.
