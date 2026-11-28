# Intent: Only one demo project in the project list

Status: Approved (by the Product Owner, 2026-11-27, in chat: "please only keep 1 demo project")
Requested: 2026-11-27 by the Product Owner, in chat (with a screenshot of the Projects page showing two "Travel Journal" demo cards)

## Business need
"please only keep 1 demo project"

## What we want
Anyone who opens the demo sees one sample project, however often they click "Open demo project", so the project list
stays tidy and their own projects are easy to find.

## Done when
Clicking "Open demo project" or "Explore the demo" opens the demo project that is already in the list instead of adding
another copy, and a browser that already saved several demo copies shows only one (the most recent) after reload.
Real projects are never removed.

## Why
Every click added a new "Travel Journal" copy, so the Projects page filled up with identical demo cards.

## Constraints
No new screen, no layout change; demo data stays in this browser only.

## Out of scope
Resetting the demo to fresh sample data, and removing the demo project from the list.

## Requirements
- REQ-109 — The project list keeps only one demo project
