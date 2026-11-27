# Intent: See work move on the Team floor on a phone

Status: Approved (by the Product Owner, 2026-11-27, in chat)
Requested: 2026-11-26 from the review of #20, logged as issue #26; started by the Product Owner on 2026-11-27 ("start it")

## Business need
"create a separate issue and work on it later" (the Team floor phone gaps), then: "start it"

## What we want
On a phone the Product Owner sees work move from one agent to the next, as on desktop: when a run is handed on, or a review
sends it back, a short strip above the desks shows who handed what to whom, and the receiving desk is marked for a moment.
Today below 720 px the corridor is hidden, so handoffs are invisible on phones. (The second gap of #26 — reaching every
waiting run from the phone banner — was solved by REQ-061.)

## Why
The Team floor is meant to be watched anywhere (REQ-009); on a phone the most visible part of the team's work is missing.

## Constraints
- A view of the run trace only (ADR-003): no new requests, agent calls or libraries; honey design system tokens only
- Reduced motion or Pause motion: nothing slides — the strip simply appears and fades
- Desktop unchanged

## Success measure
On a 390 px screen every handoff shown on desktop during the same 4 seconds is also shown on the phone, forward in honey and
sent-back in coral, with the receiving desk marked.

## Out of scope
New kinds of handoffs; sound or vibration.

## Requirements
Feature F-009 · Team floor (follow-up, issue #26)
- REQ-063 — Handoffs are shown on phones too (#26) · tests TC-311 … TC-315
