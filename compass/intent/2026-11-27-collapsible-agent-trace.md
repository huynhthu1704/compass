# Intent: Fold away the agent's step-by-step trace

Status: Approved (by the Product Owner, 2026-11-27, in chat)
Requested: 2026-11-27 by the Product Owner, in chat (screenshot of the Ideation agent run on the Idea page)

## Business need
"allow user to collapse the detailed steps inside" — the trace box of an agent run ("Trace · harness → RAG → tools →
guardrails & evals").

## What we want
The step-by-step trace of an agent run can be folded and unfolded with one click, so the Product Owner reaches the
agent's proposal and the approval buttons without scrolling past every tool call. The trace is open while the agent is
working, and folded once the run waits for approval or has finished; a folded trace still shows how many steps it has
and whether a step failed.
Target: on the Idea page with an awaiting-approval run of ~15 steps, the proposal is visible without scrolling past the trace.

## Why
A run's trace lists every model turn, tool call and result (often 15–40 lines). On the stage pages the trace sits above
the proposal, so the Product Owner scrolls through technical steps to reach what needs her decision.

## Constraints
- Nothing is hidden for good: one click shows the full trace again; each step's own details still expand as today
- Keyboard and screen-reader friendly (a real button with expanded/collapsed state)
- Honey design system tokens only; no new libraries

## Success measure
A test shows the trace folded for awaiting-approval and finished runs and open for running ones, and that the toggle
switches it; a screenshot of the Idea page shows the proposal right below a one-line folded trace.

## Out of scope
Remembering the choice between visits; folding other cards (guardrails, change set).

## Requirements
Feature F-017 · Collapsible agent trace
- REQ-045 — The agent trace can be folded and unfolded
