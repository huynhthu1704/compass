# Intent: See what each waiting approval is about, at a glance

Status: Approved (by the Product Owner, 2026-11-27, in chat)
Requested: 2026-11-27 by the Product Owner, in chat (screenshot of the Team floor with 6 waiting approvals) · Issue #38

## Business need
"how can user view the details of work items that are waiting for their approval" — then: "please log it as the issue and
start working on it"

## What we want
From the Team floor alone, the Product Owner can tell what each waiting item is about and how long it has waited, without
opening it, and the floor keeps its shape however many items wait.
Today every item on the Your approval desk only says "Ideation · F-003" (sometimes twice) and 6 waiting items stretch the floor.
Target: each item shows its goal and waiting time; the desk shows at most 3 items plus "+N more"; details open in a side panel.

## Why
With several waiting runs the Product Owner cannot tell them apart from the floor and has to open each one.

## Constraints
- Approving and rejecting still happen only on the run page, so the result is the same as from Agent runs (REQ-008, ADR-003)
- A view of the run trace only: no extra Claude calls, requests or libraries; honey design system; works on phones
- Figma design approved before code (SCR-5 … SCR-7 of F-009)

## Success measure
With 6 waiting runs the desk is no taller than with 3, and every waiting run can be identified and opened from the floor.

## Out of scope
Approving directly in the side panel; the other Team floor phone gaps (#26).

## Requirements
Ids REQ-060 … REQ-062 and TC-300 … TC-309: REQ-020 … REQ-054 and TC-039 … TC-213 are used by other open branches.
These requirements amend REQ-008 (AC1) and REQ-009 (AC2) of the Team floor: the desk lists at most 3 items that open their details.

Feature F-009 · Team floor (follow-up, issue #38)
- REQ-060 — Each waiting item says what it is and how long it has waited
- REQ-061 — The approval desk stays compact, with a link to all waiting runs
- REQ-062 — Details of a waiting item open in a side panel
