# Plan: REQ-025 Figma components on the Components page, one section per feature

Feature: F-003 · Requirements: REQ-025 · Test cases: TC-045
Intent: compass/intent/2026-11-27-figma-components-and-sections.md · Design: none (rule for the Figma file, no UI) · Decision: ADR-007

## Files
- `compass/design/README.md` and its installed copy `src/framework/design-README.md` (kept identical, TC-004) — Flow
  step 2 states the Figma file layout; the template links the feature's section
- `AGENTS.md` — step 1b names the rule
- `tests/figmaLayout.test.mjs` — TC-045: the three texts state both rules
- `compass/intent/2026-11-27-figma-components-and-sections.md`, `compass/spec.json` (REQ-025, TC-045, ADR-007) and the
  views generated with `src/framework.ts` (requirements.md, tests.md, decisions.md, features/F-003.md)

## Steps
1. Plan (this file). The Figma file "Compass — Team floor" was already tidied in this session: 8 components moved to
   "🧩 Components" (sections "Design system components", "Prototype components", "F-015 · Team access components";
   instances left where they were shown), and loose feature screens on "📐 Feature designs" grouped into sections
   170:972–170:977. Node ids are unchanged, so existing frame links still work.
2. Rule text in both copies of the design README and AGENTS.md; TC-045.
3. Spec (REQ-025, TC-045, ADR-007) and the generated views.

## Risks
- The installed copy changes what Compass writes into connected repos on the next framework install: text only,
  the same rule as travel-map REQ-061.
- CI cannot read Figma, so the layout itself is not checked automatically; TC-045 keeps the rule in the texts.

## Proof
- `npm test` (TC-045, TC-004 no drift), `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.
