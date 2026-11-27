# Plan: REQ-108 Acceptance criteria and test steps are readable on the agent run page

Feature: F-011 · Requirements: REQ-108 · Test cases: TC-508
Intent: compass/intent/2026-11-27-larger-ac-text.md · Design: none (text size only; F-011 design keeps its approved layout)

## Files
- compass/intent/2026-11-27-larger-ac-text.md — the Product Owner's need, approved in chat
- compass/spec.json — REQ-108 (F-011, `design: "none: …"`) and TC-508
- compass/requirements.md, compass/tests.md — regenerated views
- tests/readability.test.mjs — TC-508
- src/index.css — `.ac-line` sets 13 px / 20 px (overrides `.mono-sm` 11 px / 16 px)
- src/components/RunView.tsx — test-case steps use `ac-line` instead of an inline `white-space` style

## Steps
1. Commit this plan.
2. Add the intent, REQ-108, TC-508, the regenerated views and the failing TC-508.
3. Change `.ac-line` and the test-steps class so TC-508 passes.
4. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- Other small monospace text (ids, paths, times, design elements) must stay 11 px: only `.ac-line` changes, `.mono-sm` is untouched (TC-508 checks both).
- `.ac-line` must win over `.mono-sm`: same specificity, and `.ac-line` comes later in index.css (TC-508 checks the order).
- Longer lines wrap more on phones: `pre-line` already wraps; no fixed heights on these rows.

## Proof
- `npm test` incl. TC-508 (fails before the CSS change).
- Computed style in Chromium: an AC line is 13 px with `pre-line`, a plain `.mono-sm` element stays 11 px.
