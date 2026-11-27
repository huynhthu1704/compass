# Intent: Hide the Knowledge page from the sidebar

Status: Approved (by the Product Owner, 2026-11-27, in chat: "hide for all")
Requested: 2026-11-27 by the Product Owner, in chat

## Business need
"so it's does not need for end-user like me? shall we hide it" … "hide for all"

## What we want
People using the Compass portal, in every role, see only the pages of the delivery flow in the sidebar. The Knowledge
page (what the agents can search) is a technical view and no longer has a sidebar link.

## Done when
No role sees a Knowledge link in the sidebar; the project links are Feature board, Team floor, Agent runs and Release.
The agents still index and search the repository, and the page still opens from its address for anyone debugging them.

## Why
The Product Owner reviews the agents' output, not where it came from; each agent run already lists the sources it used.
Checked on 2026-11-27: the page did not help QA either, since the 150-file index holds no test files of travel-map.

## Constraints
No change to how agents index or search (src/rag.ts, src/harness.ts); the page and its route stay.

## Out of scope
Making the index include test files or more than 150 files (a separate idea); deleting the Knowledge page.

## Requirements
- REQ-075 — The sidebar has no Knowledge link for any role (#95)
