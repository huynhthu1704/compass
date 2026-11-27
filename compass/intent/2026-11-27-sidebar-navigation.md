# Intent: A left sidebar that is quick to scan and easy to use

Status: Approved (by the Product Owner, 2026-11-27, in chat)
Requested: 2026-11-27 by the Product Owner, in chat (with a screenshot of the portal sidebar)

## Business need
"revise the left sidebar for better UI/UX"

## What we want
The left sidebar of the Compass portal lets the Product Owner (and every other role) find a page, see the state of the
open project and switch settings at a glance:
1. **Scannable groups.** Three clear groups — workspace (Projects, Agent architecture), the open project, and the
   account — separated by a line, with an icon before every page link and no large empty gap in the middle.
2. **The open project as a card.** Its name and its GitHub sync state ("Synced with GitHub", "Sync failed", "Demo
   project", "Local project", …) in one card that also leads back to the project list.
3. **One approval count, not two.** Today the same "6 waiting for approval" number shows on both Team floor and Agent
   runs; it should show once, on Team floor, with a tooltip saying what it counts.
4. **Plain labels.** "Knowledge (RAG)" becomes "Knowledge" (the technical term moves to the tooltip); Agent runs sits
   next to Team floor.
5. **A readable feature list.** A stage-coloured dot, the name on up to two lines (no "Increase the number…" cut-offs),
   the short id on the right, a count next to the heading, and the full name and stage on hover.
6. **A tidy footer.** The GitHub connection as an account card, the role picker full width, and one light/dark button.
7. **Keyboard friendly.** Every sidebar item shows a visible focus ring (today none does).

Target: the Product Owner approves the before/after screenshots (done 2026-11-27); a sidebar item can be reached and
seen with the keyboard; the approval count appears exactly once.

## Why
The Product Owner found the sidebar hard to scan: text-only links, a duplicated badge, jargon ("RAG"), cut-off feature
names, a large empty area and a crowded footer.

## Constraints
- Same honey design system and tokens, light and dark mode; no hard-coded colours; no new libraries.
- Same routes and pages; nothing removed from the sidebar.
- Phone layout (Menu button below 900 px) keeps working.

## Success measure
Before/after screenshots approved; automated checks for the structure, the single count and the theme toggle; manual
checks for focus, long names and the phone menu.

## Out of scope
A collapsible (icon-only) sidebar, a project switcher drop-down, search, a redesign of the pages themselves.

## Requirements
Feature F-013 · Sidebar navigation
- REQ-020 — The sidebar is grouped, has icons and shows the open project as a card (#46)
- REQ-021 — The approval count shows once, on Team floor (#47)
- REQ-022 — The feature list is readable (#48)
- REQ-023 — The account footer shows the connection, the role and one theme button (#49)
