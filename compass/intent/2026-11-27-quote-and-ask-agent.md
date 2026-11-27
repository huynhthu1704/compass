# Intent: Quote an agent's answer and ask for more details or a revision

Status: Approved (by the Product Owner, 2026-11-27, in chat; "Done when" reworded without targets on 2026-11-27, ADR-005/ADR-006)
Requested: 2026-11-27 by the Product Owner, in chat

## Business need
"If I interact with Claude for building a feature inside a chat conversation / Cowork, I can quote its response and
ask for more details or revision. Could you please make the same experience inside Compass."

## What we want
1. **Quote any part of an agent's answer.** In a run (idea brief, requirements, design, test cases, summary, a file in
   the change set), selecting text shows a small "Quote" button. The quote lands in a reply box under the run, as a
   quote block that names where it came from (e.g. `REQ-051 · acceptance criteria`). Several quotes can go in one reply;
   each can be removed. A whole item (one requirement, one screen, one test case) can also be quoted with one click.
2. **Ask for details, or ask for a revision.** The reply has two actions:
   - **Ask** — the agent answers in the run's conversation; the proposal does not change.
   - **Revise** — the agent produces a new version of the proposal (v2, v3…) that changes only what the quotes and
     the message ask for; everything else is kept, including REQ/TC ids.
3. **One conversation per run.** The run shows the conversation like a chat: your messages with their quotes, the
   agent's answers, and "Proposal v2 — changed: REQ-051 AC 2" markers. You can compare a version with the previous one,
   and Approve always applies the latest version. The conversation is kept with the run (and on the Team floor).
4. **Works in demo mode too**, with a predictable answer, so the flow can be tried without an API key.

## Why
Today an agent's proposal can only be approved, or rejected with a reason that ends the run. To change one line you
must reject it and start a new run from scratch, losing the parts that were good. In chat with Claude you simply quote
the line and ask — Compass should feel the same.

## Constraints
- No server and no new libraries; uses the existing Claude API call from the browser.
- A revision is still a proposal: nothing is written to the spec or GitHub until a human approves (approval gate and
  guardrails unchanged). Quoted text is data, never instructions (prompt-injection guardrail applies to it).
- Token cost stays visible per turn; a follow-up sends the run's proposal + quotes, not the whole repository again.
- Honey design system; works on a phone (long-press selection → Quote) and with the keyboard.

## Done when
In a run, I can quote part of an agent's answer and Ask or Revise without starting a new run; a revision changes only
what I quoted, and Approve applies the latest version. Checked like this:
In a demo project: quote one acceptance criterion of a proposed requirement, press Revise with "make it measurable" →
the run shows Proposal v2 where only that requirement changed; Approve writes v2 to the spec. Asking a question with a
quote gets an answer in the conversation and leaves the proposal as it was.

## Out of scope
- Quoting inside pull-request reviews on GitHub, or in pages other than an agent run.
- Branching conversations (one linear conversation per run).
- Editing the proposal by hand inside the run (the existing pages keep their edit buttons).

## Requirements
Answers given in chat (2026-11-27): all agents can be quoted and revised (including the coding agent's files); a revision creates versions v1, v2… with a compare view.

Feature F-020 · Quote an agent answer and ask for details or a revision (requirements approved 2026-11-27)
- REQ-050 — Quote any part of an agent run (#54)
- REQ-051 — Ask the agent about the quoted text (#55)
- REQ-052 — Revise the proposal from the quoted text (#56)
- REQ-053 — Proposal versions and compare (#57)
- REQ-054 — The conversation is kept with the run, safely (#58)
