# Plan: REQ-074 Remove the "AI dev portal" tagline from the UI

Feature: F-013 · Requirements: REQ-074 · Test cases: TC-406
Intent: compass/intent/2026-11-27-remove-portal-tagline.md · Design: compass/design/F-013.md (SCR-1 brand element)

## Files
- compass/plans/REQ-074-remove-tagline.md — this plan (first commit)
- compass/intent/2026-11-27-remove-portal-tagline.md — the Product Owner's request, approved in chat
- compass/spec.json — REQ-074 and TC-406 in F-013; the SCR-1 brand element reads "logo, \"Compass\"" and lists REQ-074
- compass/design/F-013.md, compass/requirements.md, compass/tests.md — the matching view lines
- src/components/Sidebar.tsx — the brand shows the logo and "Compass" only
- src/index.css — drop the `.brand-text span` rule and the column layout that only served the tagline line
- src/pages/Onboarding.tsx — the overline reads "Compass" instead of "Compass · AI dev portal"
- tests/sidebar.test.mjs — TC-406: no "AI dev portal" text in any file under src/ (code comments stripped, not shown in the UI)

## Steps
1. Commit this plan.
2. Add the intent, REQ-074, TC-406 and the design element change; write TC-406 (fails first).
3. Remove the tagline from the sidebar brand and the onboarding overline; TC-406 passes.
4. `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- **Brand layout shifts** once the second line is gone: the unused `.brand-text span` rule and column layout are removed;
  the logo and name stay aligned (the `.brand` flex row). Checked with a build and a screenshot.
- **Docs still say "AI dev portal"** (README, AGENTS.md, types.ts comment): out of scope — the request is about the UI only.

## Proof
- `npm test`: TC-406 passes, plus all earlier tests (TC-400 … TC-404).
- `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main` pass.
