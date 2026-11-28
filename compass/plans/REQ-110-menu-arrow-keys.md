# Plan: REQ-110 Arrow keys work after the menu header was clicked

Feature: F-013 · Requirements: REQ-110 · Test cases: TC-510
Intent: compass/intent/2026-11-28-sidebar-account-menu.md · Design: compass/design/2026-11-28-account-menu.md

## Files
- compass/plans/REQ-110-menu-arrow-keys.md — this plan
- compass/spec.json, compass/tests.md — TC-510 gherkin adds the arrow keys from the header
- src/components/Sidebar.tsx — the arrow-key handler moves from the `role="menu"` list to the `.account-menu` popover; from the header, ArrowDown goes to the first item and ArrowUp to the last
- tests/sidebar.test.mjs — TC-510 checks the handler placement and `moveFocus` from outside the items

## Steps
1. Commit this plan.
2. Move the handler, make `moveFocus` start at the first or last item when focus is not on an item, update TC-510 and its gherkin.
3. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, and a browser check.

## Risks
- `moveFocus` must still find only menu items (it queries `[role^="menuitem"]` inside the popover; the header has no role).
- Arrow keys between items must keep wrapping (browser check).

## Proof
- `npm test` incl. TC-510; build, check-spec and guardrails OK.
- Browser: click the header, ArrowDown → Connections, ArrowUp → Sign out; arrows between items still wrap.
