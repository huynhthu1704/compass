# Plan: REQ-063 Handoffs are shown on phones too

Feature: F-009 · Requirement: REQ-063 · Test cases: TC-311 … TC-315 · Issue: #26
Intent: compass/intent/2026-11-27-phone-handoffs.md · Design: compass/design/F-009.md SCR-8, SCR-9

## Files
- compass/plans/REQ-063-phone-handoffs.md — this plan (first commit)
- src/teamFloor.ts — `Floor.strip`: the recent handoffs (already computed for the desktop corridor) as phone strip items,
  newest first, at most 3: short agent names ("Ideation", "Requirements", "Coding", "Review"), the card label, the exact
  sentence ("Handed to the Design agent — it starts now" / "The review sent the work back to the Coding agent") and the
  receiving desk
- src/pages/TeamFloor.tsx — the strip inside `section.floor` above the desk grid (only when `strip` has items), and a ring
  class on the receiving desk
- src/index.css — the strip (honey forward, coral back), hidden from 720 px; the ring is an outline outside the desk card
  (so it is not confused with the coral Rework border) and only below 720 px; the card slide only inside
  `@media (prefers-reduced-motion: no-preference)` and `.floor:not(.paused)`
- tests/teamFloor.test.mjs — TC-311, TC-313, TC-314, TC-315 (TC-312 is the manual phone check)
- compass/spec.json + generated views (requirements.md, features.md, features/F-009.md, handover.md) — REQ-063 In build

## Steps
1. Commit this plan.
2. Write the tests (they fail on today's code), then `strip` in computeFloor, then the page and CSS.
3. `npm test`, `npm run build`; Playwright at 390 px in demo mode: approve a waiting Ideation run → honey strip and ring, both gone
   after about 4 s; a blocked Coding run (TC-312 back case, by reading the code path if demo cannot block); reduced motion and
   Pause; 1440 px unchanged.
4. Set REQ-063 to In build; regenerate the touched views.

## Risks
- **Desktop changes by accident:** the strip and ring rules live only below 720 px; TC-314 checks it and a 1440 px screenshot is
  compared with main.
- **Motion:** only with no-preference and not paused (TC-313).
- **Colour meaning:** TC-315 checks coral (danger) for back and honey (brand) for forward.

## Proof
- `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build`.
- Screenshots at 390 px (strip and ring) and 1440 px (unchanged).
