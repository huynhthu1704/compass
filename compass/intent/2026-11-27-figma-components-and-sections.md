# Intent: Tidy Figma file — components on one page, one section per feature

Status: Approved (by Christine, 2026-11-27 — direct request in chat to apply it and record the rule)
Requested: 2026-11-27 by Christine, in chat

## What we want
The Product Owner reviews a feature's design at a glance and finds every reusable piece in one place: in the
project's Figma file all components live on the "Components" page, and each feature's screens are grouped in one
Figma section — now and for every future feature, in Compass and in the projects Compass installs its framework into.

## Done when
- Every component of the "Compass — Team floor" Figma file is on "🧩 Components" (none on the prototype, design
  system or feature pages).
- Each feature's screens on "📐 Feature designs" sit inside one section.
- The design template (`compass/design/README.md`, and the copy Compass installs) and AGENTS.md state both rules.

## Business need
"move all figma components into the figma page called 'Components', and it should work for all future feature.
for new feature, create a figma section and group all related screen into one section for clearer review and
visualization, update this rule to the repo if needed to remember this request"

## Why
Components were scattered over the prototype, design-system and feature pages, and many feature screens lay loose
on the canvas, which made reviews harder to follow.

## Constraints
- Figma node ids must not change, so existing frame links keep working (moving a node keeps its id).
- No protected paths; no change to how the app behaves.
- Same rule as travel-map REQ-061.

## Out of scope
- Redesigning components or screens.
- An automatic check of the Figma file's layout (CI cannot read Figma).

## Requirements
- REQ-025 — Figma components on the Components page, one section per feature (#84)
