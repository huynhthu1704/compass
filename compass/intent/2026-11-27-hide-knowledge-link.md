# Intent: Hide the Knowledge page from the sidebar, then remove it

Status: Approved (by the Product Owner, 2026-11-27, in chat: "hide for all"; extended 2026-11-28, in chat: "Block the Knowledge page completely … proceed with this")
Requested: 2026-11-27 by the Product Owner, in chat

## Business need
"so it's does not need for end-user like me? shall we hide it" … "hide for all"

2026-11-28: "hide for everyone" — then, offered the choice to block the page's address as well: "proceed with this".

## What we want
People using the Compass portal, in every role, see only the pages of the delivery flow in the sidebar. The Knowledge
page (what the agents can search) is a technical view: first its sidebar link goes (REQ-075), then the page itself, so
its address opens the Feature board (REQ-076).

## Done when
No role sees a Knowledge link in the sidebar; the project links are Feature board, Team floor, Agent runs and Release.
The agents still index and search the repository. The portal has no Knowledge page: `/p/<project>/knowledge` opens
the Feature board. To see what an agent used, read its run: each run lists the sources it retrieved.

## Why
The Product Owner reviews the agents' output, not where it came from; each agent run already lists the sources it used.
Checked on 2026-11-27: the page did not help QA either, since the 150-file index holds no test files of travel-map.

## Constraints
No change to how agents index or search (src/harness.ts, the search in src/rag.ts). The manual "Re-index" button goes
with the page; a browser reload clears the in-memory index, so the next agent run reads the repository again.

## Out of scope
Making the index include test files or more than 150 files (a separate idea); the agents' `search_knowledge` tool
and the RAG description on the Agent architecture page (they describe how agents work, not the removed page).

## Requirements
- REQ-075 — The sidebar has no Knowledge link for any role (#95)
- REQ-076 — The portal has no Knowledge page; its address opens the Feature board (#128)
