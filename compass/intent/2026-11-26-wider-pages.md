# Intent: Pages use the width of large screens

Status: Approved (by the Product Owner, 2026-11-26, in chat)
Requested: 2026-11-26 by the Product Owner, in chat (screenshot of the Team floor on a wide screen)

## Business need
"why is the right hand side empty space too large" — then: "Every page grows wider, for example up to 1600 px, or with no
limit at all. Please proceed with this option, but be responsive for narrower screen"

## What we want
On large screens every Compass page uses up to 1600 px of width instead of stopping at 1240 px, so a wide monitor no longer
shows a large empty band on the right. On narrower screens nothing gets worse: pages still shrink to fit, side padding
scales down smoothly, and the phone layout stays as it is.
Target: at 1920 px the content area is 1600 px wide (today 1240 px); at 1280 px and 390 px there is no sideways scrolling.

## Why
On the Product Owner's wide screen about a third of the Team floor page is empty, while desks and the activity list are cramped.

## Constraints
- Same design system; no new libraries
- Form pages that set their own reading width (New project, Connections) keep it
- Phone layout (below 900 px) unchanged

## Success measure
Screenshots at 1920, 1280 and 390 px: content 1600 px wide at 1920, no horizontal scroll at any width.

## Out of scope
Changing page layouts or adding columns on wide screens.

## Requirements
Feature F-011 · Readability follow-ups
- REQ-015 — Pages use up to 1600 px on large screens and stay responsive (#29)
