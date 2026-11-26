# Plan: REQ-011 align the status labels in the Release page's CI / deploy runs

Feature: F-010 · Requirements: REQ-011 · Test cases: TC-016, TC-020, TC-021 (unchanged; layout-only fix)
Intent: compass/intent/2026-11-26-honey-brand.md · Design: compass/design/F-010.md

## Files
- src/pages/Release.tsx — wrap the status chip of each CI / deploy run in the existing `.run-status` column; keep the time on one line and let long run names (commit SHAs) wrap

## Steps
1. Reuse `.run-status` (fixed 128 px column, added in #21 for the agent run lists) for the workflow run rows on the Release page, so the run names start at the same x position whatever the status ("success", "failure", "skipped", "in_progress", …).

2. Keep the "x min ago" time on one line (`white-space: nowrap`) and let a long run name such as `Deploy <40-char SHA>` break (`overflow-wrap: anywhere`), so the SHA no longer squeezes the time onto three lines.

## Risks
- The longest GitHub statuses ("action_required", "startup_failure", about 110 px) still fit in 128 px.
- Layout only; no data or behaviour change.

## Proof
- Screenshot of the Release page's run list with success / failure / skipped / in_progress / action_required rows: names line up.
- `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main` pass.
