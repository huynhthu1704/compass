# Intent: Clear status labels and a readable stage strip on phones

Status: Approved (by the Product Owner, 2026-11-26, in chat)
Requested: 2026-11-26 by the Product Owner, in chat (follow-ups from the independent review of #19)

## Business need
"Should I turn the 'Draft' vs 'Approved' label colours and the cramped phone stage strip into requirements for later?" — "yes please"

## What we want
1. **Status labels you can tell apart at a glance.** In the honey theme, "Draft" (warning) and "Approved" (brand) labels
   are both honey with nearly the same text colour. Draft should look unfinished (neutral grey) and Approved should look
   settled (mint, like "done"), on requirements, test cases and features, in light and dark mode.
   Target: the Product Owner can tell a Draft from an Approved label without reading it.
2. **A stage strip that reads well on a phone.** On a feature page, the six stage cards (Idea → Release) are squeezed
   into narrow columns on a phone, so words break mid-word. On screens below 720 px the strip should become a vertical
   list (or a horizontal scroller) where every label and number is on whole words.
   Target: no word is broken across lines in the stage strip at 390 px wide.

## Why
Found while reviewing the honey rebrand (#19). Both make the portal harder to read; neither existed as a requirement.

## Constraints
- Same honey design system and tokens; no new colours outside the tokens; no new libraries
- Text keeps WCAG AA contrast (4.5:1)
- Desktop layout of the stage strip stays as it is

## Success measure
Draft and Approved labels use different colour families (checked by a test); a 390 px screenshot of a feature page shows
no broken words in the stage strip.

## Out of scope
Other label colours; a redesign of the feature page.

## Requirements
Feature F-011 · Readability follow-ups
- REQ-013 — Draft and Approved labels look different at a glance
- REQ-014 — The stage strip of a feature reads well on a phone
