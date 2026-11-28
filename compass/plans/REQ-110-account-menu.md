# Plan: REQ-110 The sidebar footer is one account card with an account menu

Feature: F-013 · Requirements: REQ-110 · Test cases: TC-510
Intent: compass/intent/2026-11-28-sidebar-account-menu.md · Design: compass/design/2026-11-28-account-menu.md

## Files
- compass/plans/REQ-110-account-menu.md — this plan
- compass/intent/2026-11-28-sidebar-account-menu.md — the Product Owner's request and approval in chat
- compass/design/2026-11-28-account-menu.md — the approved design (screens, states, Figma section)
- compass/spec.json — REQ-110 (F-013), TC-510, ADR-019 ("Try the demo" leaves the sidebar)
- compass/requirements.md, compass/tests.md, compass/decisions.md — regenerated views
- src/sidebar.ts — pure helpers: `accountChips` (role chips on the card) and `accountMenu` (menu items per state)
- src/components/Sidebar.tsx — footer = account card that opens the account menu; the role picker shows only without sign-in or in the demo
- src/index.css — account card chips and the menu popover (honey tokens, light and dark)
- tests/sidebar.test.mjs — TC-510

## Steps
1. Commit this plan.
2. Add the intent, design file, REQ-110, TC-510, ADR-019 and the regenerated views.
3. Add the pure helpers and TC-510; then rewrite the footer in Sidebar.tsx and add the CSS.
4. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`; take light/dark and phone screenshots.

## Risks
- Losing an action: Connections, theme, Sign out and Leave demo all stay reachable in the menu; TC-510 lists them per state.
- "Try the demo" leaves the sidebar (Product Owner's decision, ADR-019): signed-in people still find it on the "You have no access yet" screen.
- The menu must work by keyboard and on the phone menu: it is a `role="menu"` popover inside the footer, closes on Escape, outside click or after a choice, and stays within the sidebar width.
- The existing TC-404 theme assertions must still hold: one theme control, now checked as `title={theme.label}` on the "Dark theme" switch (changed in review).
- No sign-in code changes: the card shows the part of the email before "@" (the full name is not stored today).

## Proof
- `npm test` incl. TC-510 and the existing TC-400 … TC-407.
- Screenshots of the footer closed, menu open (light and dark) and on a phone, compared with the approved design.
