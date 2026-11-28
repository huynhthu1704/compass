# Plan: REQ-010 Honey checkboxes and radio buttons everywhere

Feature: F-010 · Requirements: REQ-010 (new AC4) · Test cases: TC-529
Intent: compass/intent/2026-11-26-honey-brand.md · Design: compass/design/F-010.md (no new screen: the approved honey design system)

## Files
- src/index.css — one rule: `input[type="checkbox"], input[type="radio"] { accent-color: var(--color-bg-brand); }`
- compass/spec.json — REQ-010 AC4 (asked by the Product Owner in chat on 2026-11-28), TC-529
- tests/honeyTheme.test.mjs — TC-529

## Steps
1. Add AC4 and TC-529 to the spec and this plan.
2. Add the CSS rule next to the form controls in src/index.css.
3. TC-529; `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build`; screenshots of the Team page and Connections checkboxes in light and dark mode.

## Risks
- A light honey fill could leave a light check mark → browsers pick the check mark colour by contrast with accent-color; checked in screenshots (dark mark on honey in both themes).
- Pull request #142 (REQ-121) sets the same colour inline on the sidebar roles checkboxes → same token, so nothing changes visually. #142 merged first; its TC-527 and this PR's TC-529 were added at the same place in compass/spec.json, so main was merged in keeping both (by id). Dropping the inline style later must update TC-527 in tests/designLinks.test.mjs, which checks it.

## Proof
- `npm test` TC-529
- Screenshots of ticked checkboxes on the Team page and Connections, light and dark
