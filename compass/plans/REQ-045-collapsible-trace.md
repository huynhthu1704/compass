# Plan: REQ-045 The agent trace can be folded and unfolded

Feature: F-017 · Requirements: REQ-045 · Test cases: TC-090, TC-091
Intent: compass/intent/2026-11-27-collapsible-agent-trace.md · Design: compass/design/F-017.md (Figma SCR-1, node 98-609)

## Files
- compass/plans/REQ-045-collapsible-trace.md — this plan (first commit)
- src/trace.ts — pure helpers (types-only imports, so Node runs them in tests): `traceDefaultOpen(status)` (open only while
  `running`), `traceOpen(status, manual)` (the Product Owner's toggle wins over the default), `traceSummary(steps)`
  (`15 steps`, failed count) and `traceToggleLabel(open)` (`Show steps` / `Hide steps`)
- src/components/RunView.tsx — the trace card gets a header row: chevron, overline, step count, red "N failed" chip when
  steps failed, and a real `<button>` with `aria-expanded` / `aria-controls`; the timeline renders only when open. The
  manual choice is stored with the run id, so another run starts from its own default
- src/index.css — `.trace-head` row (wraps on phones) using existing tokens only
- tests/trace.test.mjs — TC-090 (default state, header, toggle) and TC-091 (native button with aria-expanded/aria-controls, timeline only when open, step `<details>` kept)
- No spec status change in this PR: marking REQ-045 In build would regenerate three views; the status moves to Done with
  the release (same as F-011).

## Steps
1. Commit this plan.
2. Write tests/trace.test.mjs (fails: src/trace.ts does not exist), then src/trace.ts.
3. Wire the header and toggle into RunView; add `.trace-head` CSS.
4. `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build`; Playwright
   screenshots of an awaiting-approval demo run (folded, then after Show steps) at 1440 px and 390 px.

## Risks
- **Status change overrides her choice:** `traceOpen` returns the manual value whenever one is set; TC-090 checks it.
- **Hidden failures:** the folded header still shows the red failed-steps chip; TC-090 checks the count.
- **Accessibility:** a native button (Enter/Space for free) with `aria-expanded` and `aria-controls` pointing at the timeline id.
- **Compact run view (AgentBox) and full view (Build, Agent runs):** both use RunView, so both get the same behaviour.

## Proof
- `npm test`: TC-090 and TC-091 pass, plus all earlier tests.
- `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build` pass.
- Screenshots of the folded and open trace in the demo project.
