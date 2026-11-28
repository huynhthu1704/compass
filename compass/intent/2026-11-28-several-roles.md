# Intent: Pick several roles on "What's your role?"

Status: Approved (by the Product Owner, 2026-11-28, in chat)
Requested: 2026-11-28 by the Product Owner, in chat (with a screenshot of the "What's your role?" screen): "for demo mode, allow user to select multiple role"

## Business need
"for demo mode, allow user to select multiple role"

## What we want
A person trying Compass can hold several roles at once, as a real team member can (the Team page already gives
people several roles), so they can see every part of the flow their roles touch without switching back and forth.
This applies wherever the "What's your role?" screen appears: in the demo after sign-in, and in a copy of Compass
that runs without sign-in (the Product Owner chose "Both" in chat).

## Done when
On "What's your role?" the person can tick one or more roles (Continue needs at least one); the sidebar shows the
chosen roles and lets them tick or untick roles from a checkbox menu, always keeping at least one; and the portal
treats them as holding every chosen role (for example, PO among them makes them the design-files admin).

## Why
The demo showed one role at a time, so trying the whole flow meant changing the role in the sidebar again and again,
and it did not match how teams really work (one person is often PO and BA).

## Constraints
With sign-in on, real roles still come only from the team (ADR-014): this changes only the role picker. The demo still
reads and writes nothing in Firebase or GitHub (REQ-040 AC3), and leaving the demo forgets the demo roles.

## Out of scope
Changing how team roles are given on the Team page.

## Requirements
- REQ-121 — Pick one or more roles on "What's your role?" and in the sidebar
