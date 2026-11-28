# Plan: REQ-110 / REQ-041 No Connections in the demo

Feature: F-013 (REQ-110), F-015 (REQ-041) · Requirements: REQ-110, REQ-041 · Test cases: TC-510, TC-080
Intent: compass/intent/2026-11-28-sidebar-account-menu.md · Design: compass/design/2026-11-28-account-menu.md · Decision: ADR-027

## Files
- compass/plans/REQ-110-no-connections-in-demo.md — this plan
- compass/spec.json — ADR-027 (the Product Owner's decision); amend REQ-110 AC2, the REQ-041 demo AC, the TC-510 and TC-080 gherkin
- compass/requirements.md, compass/tests.md, compass/decisions.md — regenerated views
- compass/design/2026-11-28-account-menu.md — SCR-2 notes that the demo has no Connections (ADR-027); the intent stays as approved, ADR-020 and ADR-027 record the changes
- src/sidebar.ts — `accountMenu` has no Connections in the demo
- src/team.ts — `canOpenConnections` is false in the demo, so the menu filter and the `#/connect` address both follow it
- src/components/AgentBox.tsx — no "add an Anthropic key in Connections for live runs" hint in a demo project (its agents never run live)
- tests/sidebar.test.mjs, tests/team.test.mjs — TC-510 and TC-080 cover the demo

## Steps
1. Commit this plan.
2. Add ADR-027 and amend the ACs and test texts; regenerate the views with the portal's own generators.
3. Change `accountMenu`, `canOpenConnections` and the AgentBox hint; update the tests.
4. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, and a browser check of the demo.

## Risks
- Sign-in off (no Firebase) is not the demo: Connections stays there, it is where people add their own keys.
- Pages that link to Connections (Projects "Import a GitHub repo", Import) must not loop in the demo; the demo has no Import card.
- Amending a Done requirement only follows the Product Owner's decision (ADR-027, 2026-11-28).

## Proof
- `npm test` incl. TC-510 and TC-080; build, check-spec and guardrails OK.
- Browser: in the demo, the account menu has Dark theme, Leave demo and Sign out but no Connections; `#/connect` lands on Projects; the agent card has no Connections hint. With sign-in off, Connections is still in the menu.
