# Plan: REQ-015 Pages use up to 1600 px on large screens and stay responsive

Feature: F-011 · Requirements: REQ-015 · Test cases: TC-027, TC-028
Intent: compass/intent/2026-11-26-wider-pages.md · Design: none (width limit and padding only)

## Files
- compass/plans/REQ-015-wider-pages.md — this plan (first code commit)
- src/index.css — `.main`: `max-width` 1240px → 1600px; side padding `clamp(var(--spacing-lg), 3vw, var(--spacing-3xl))`
  so it shrinks smoothly from 48 px to 16 px; the below-900 px rule stays as it is; `min-width: 0` so wide content (the feature board) scrolls inside itself instead of
  widening the page — found while measuring: the board made the page scroll sideways at 1280 px and 390 px (already on main)
- src/index.css (after the first review) — `.arch` columns `minmax(0, 1fr)` (4 columns, and 2 below 900 px) so Agent
  architecture no longer scrolls sideways at 901–1099 px and 390 px; option rows that have a flexible text part (`.option:has(> .grow)`: Release and Build checkbox rows, the
  agent's file-change list) wrap and their path/text may break, so they fit a phone; rows without one (the onboarding role
  picker) keep one line — a global wrap broke the role picker (second review)
  (both overflows were already on main and fall under REQ-015's "no sideways scrolling")
- tests/readability.test.mjs — TC-027 reads the `.main` rule, the `.arch` and `.option` rules
- compass/spec.json, the intent and the generated views — REQ-015 and TC-027/028 (previous commit)

## Steps
1. Write TC-027 (fails on 1240px), then change `.main`.
2. `npm test`, `npm run build`; Playwright at 1920, 1280 and 390 px on Team floor, Feature board, Requirements and New project:
   measure the content width and check `scrollWidth <= innerWidth`.

## Risks
- **Very long text lines on wide screens:** paragraphs in page headers already wrap at their own width; forms keep their own
  `maxWidth`; tables and boards benefit from the width.
- **Sideways scrolling at mid widths:** checked at 1280 px and 390 px with Playwright.
- **Phone layout changes:** the below-900 px rule is untouched (TC-027 checks it).

## Proof
- `npm test` (TC-027 and all earlier tests), `npm run build`, `node compass/check-guardrails.mjs origin/main`.
- Playwright measurements and screenshots at 1920 / 1280 / 390 px (TC-028).
