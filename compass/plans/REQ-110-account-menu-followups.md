# Plan: REQ-110 Account menu follow-ups from the review of #119

Feature: F-013 · Requirements: REQ-110 (with REQ-039, REQ-040, REQ-073 reworded) · Test cases: TC-510, TC-404
Intent: compass/intent/2026-11-28-sidebar-account-menu.md · Design: compass/design/2026-11-28-account-menu.md

## Files
- compass/plans/REQ-110-account-menu-followups.md — this plan
- compass/plans/REQ-110-account-menu.md — Risks: the TC-404 theme check is now `title={theme.label}`
- compass/spec.json — reword REQ-039 AC2, REQ-040 AC2, REQ-073 AC1/AC2 and the TC-404 gherkin to the account menu (ADR-019); TC-510 gherkin adds Escape from the card
- compass/requirements.md, compass/tests.md — regenerated views
- src/components/Sidebar.tsx — Escape closes the menu from the card too; the email header sits outside `role="menu"`
- tests/sidebar.test.mjs — TC-510 checks both

## Steps
1. Commit this plan.
2. Reword the ACs and test texts in spec.json; regenerate the views.
3. Move the key handler to the `.account` wrapper (Escape anywhere in it; arrows only inside the menu); put the header beside a `role="menu"` list inside the popover.
4. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, and a browser check of the keyboard paths.

## Risks
- Rewording approved ACs must only follow the Product Owner's decision (ADR-019, 2026-11-28); no new behaviour is added.
- Moving the key handler must keep arrows, Escape focus return and Tab-out close working (browser check + TC-510).
- CSS selectors `.account-menu button` / `.account-menu-head` must still match after the header moves.

## Proof
- `npm test` incl. TC-510 and TC-404; build, check-spec and guardrails OK.
- Browser: Shift+Tab to the card then Escape closes the menu; arrows still move between items; clicking the header keeps the menu open.
