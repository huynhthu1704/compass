# Plan: REQ-070, REQ-071, REQ-072, REQ-073 Sidebar navigation

Feature: F-013 · Requirements: REQ-070 … REQ-073 · Test cases: TC-400 … TC-405
Intent: compass/intent/2026-11-27-sidebar-navigation.md · Design: compass/design/F-013.md (Figma SCR-1 light, SCR-2 dark)

## Files
- compass/plans/REQ-070-073-sidebar-navigation.md — this plan (first commit)
- src/sidebar.ts — new, pure (types-only imports, so Node runs it in tests): the workspace and project links in order with
  their icons and tooltips, the project card state, the single approval count (Team floor only), the feature rows
  (short id, stage, tooltip), the account card and the theme button label
- src/components/Sidebar.tsx — new: renders the sidebar from `src/sidebar.ts` (icons as inline SVG with `currentColor`),
  the stage sub-list of the open feature, the role picker and the theme button
- src/App.tsx — the inline sidebar markup and its helpers move out; App renders `<Sidebar … />`
- src/index.css — sidebar v2 styles with honey tokens only: groups and dividers, icon colours, current page bar, count pill,
  project and account cards, feature dot and two-line names, stage steps, footer, a visible focus ring on every button
- tests/sidebar.test.mjs — TC-400, TC-402, TC-403, TC-404 against `src/sidebar.ts` plus source checks of the component and CSS
- No spec status change in this PR (as in F-011/F-012): statuses move with the release.

## Steps
1. Commit this plan.
2. Write tests/sidebar.test.mjs, then src/sidebar.ts until they pass.
3. Write src/components/Sidebar.tsx and the CSS, slim down src/App.tsx.
4. `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`; Playwright
   screenshots of the demo project at 1280 px and 390 px (Menu open), light and dark, compared with the approved design;
   keyboard Tab through the sidebar (TC-401, TC-405).

## Risks
- **Navigation regressions** (a page no longer reachable): TC-400 checks every link and its path; the routes in App.tsx do not change.
- **Hard-coded colours or the dark theme breaking:** only tokens are used; TC-017 (no colours outside the token blocks) keeps running;
  screenshots in both themes.
- **Phone menu:** `.sidebar` keeps its 900 px rules; screenshot at 390 px with Menu open.
- **Circular import** (`Sidebar` imports `go` from App, App imports `Sidebar`): `go` is only called on click, the same pattern
  every page already uses.

## Proof
- `npm test`: TC-400, TC-402, TC-403, TC-404 pass, plus all earlier tests (honey theme TC-017, readability, Team floor).
- `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main` pass.
- Screenshots: desktop light/dark (SCR-1, SCR-2) and phone with Menu open (TC-405); Tab focus ring visible (TC-401).
