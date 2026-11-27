# Intent: Larger acceptance-criteria text on the agent run page

Status: Approved (by the Product Owner, 2026-11-27, in chat: "approve")
Requested: 2026-11-27 by the Product Owner, in chat (with a screenshot of the requirements an agent proposed for F-001)

## Business need
"increase text size for AC as it's too small"

## What we want
When an agent proposes requirements or test cases, the Product Owner reads their Given / When / Then lines as easily
as the story above them, so they can check them before approving without zooming in.

## Done when
On the agent run page, acceptance criteria and test-case steps are shown at 13 px (the size of the story text) instead
of 11 px, keep their line breaks, and no other small monospace text in the portal changes size.

## Why
At 11 px in a light grey the criteria are hard to read, and they are the part the Product Owner approves.

## Constraints
Honey design-system tokens only; light and dark mode keep working; no layout change.

## Out of scope
The requirement editor (its text boxes are already 13 px), colours, and other small monospace text (ids, paths, times).

## Requirements
- REQ-108 — Acceptance criteria and test steps are readable on the agent run page
