# Intent: Compass shares the Bee There honey brand

Status: Approved (by the Product Owner, 2026-11-26, in chat)
Requested: 2026-11-26 by the Product Owner, in chat

## Business need
"can you make a branding color and theme similar to 'bee there' with signature honey yellow" — then: "rebrand for all pages in compass"

## What we want
Every page of the Compass portal uses the Bee There look: signature honey yellow (#FFC629) as the brand colour, warm
dark ink text, a cream canvas, Lexend headings over Be Vietnam Pro, rounded cards, pill-shaped buttons and warm shadows,
in light and dark mode. Colours keep one meaning everywhere: honey = brand and "your turn", sky = working / info,
mint = done / success, coral = rework / error.

Today Compass is teal and none of its pages use the honey brand. Target: 100% of the portal's pages use the
honey theme, with no old teal colour left in the code, from the release that ships this change.

## Why
The Product Owner wants Compass and Bee There to look like one family of products, and the new Team floor design
(F-009) is already drawn in the honey brand.

## Constraints
- Same design system as the Figma page "🎨 Design system" (Honey edition v0.2) in the file "Compass — Team floor"
- Change the theme through the design tokens (CSS variables), not page by page; no new libraries; fonts from Google Fonts like today
- Text stays readable: normal text meets WCAG AA contrast (4.5:1) in light and dark mode
- Nothing else changes: same pages, same behaviour

## Success measure
Every page shows the honey theme in light and dark mode; an automated test finds no old teal colours in `src/`.

## Out of scope
New pages or layouts; changing Bee There itself; a shared design-token package between the two repos.

## Requirements
Feature F-010 · Honey brand (added to compass/spec.json in the next change)
- REQ-010 — Compass colours follow the honey design system in light and dark mode
- REQ-011 — Compass type, shapes and logo follow the honey design system
- REQ-012 — No page keeps the old teal theme
