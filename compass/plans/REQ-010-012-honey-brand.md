# Plan: REQ-010, REQ-011, REQ-012 Honey brand on every Compass page

Feature: F-010 · Requirements: REQ-010, REQ-011, REQ-012 · Test cases: TC-014 … TC-022
Intent: compass/intent/2026-11-26-honey-brand.md · Design: compass/design/F-010.md (Figma "🎨 Design system", Honey edition v0.2) · Decision: ADR-004

## Files
- compass/plans/REQ-010-012-honey-brand.md — this plan (first commit)
- src/index.css — the whole change of look lives in the tokens: honey/ink/coral/mint/sky/violet primitives replace
  teal/amber/red/green/blue/pink/orange/cyan; semantic tokens (light and dark) take the Figma values, including the
  AA-safe text shades from ADR-004; `--font-heading` (Lexend) for headings; radius 8/14/20/28; warm shadows;
  pill buttons, segmented control and nav items; cards 20 px, drawers and large panels 28 px; the two hard-coded
  rgba() colours outside the token blocks (drawer backdrop, deleted-line strike) become tokens
- index.html — load Lexend 600 from Google Fonts next to Be Vietnam Pro and JetBrains Mono
- public/favicon.svg — honey square with the dark compass needle
- src/App.tsx — the sidebar / mobile logo uses tokens (honey square, dark needle) instead of hard-coded colours
- src/components/RunView.tsx — run status tones follow one meaning per colour: approved/done → success (mint),
  running → info (sky), awaiting-approval → accent (honey), failed → danger (coral)
- tests/honeyTheme.test.mjs — TC-014 tokens match the design system, TC-015 contrast ≥ 4.5:1 for every text token on
  canvas, surface, subtle and honey-subtle in both modes, TC-016 typefaces and weights, TC-017 no old teal and no
  hard-coded colour outside the token blocks in src/, TC-019 one meaning per state colour
- compass/spec.json + generated views (requirements.md, features.md, features/F-010.md, handover.md) — REQ-010…012 In build,
  TC-014/015/016/017/019 Pass

## Steps
1. Commit this plan.
2. Write tests/honeyTheme.test.mjs against the approved design-system values (it fails on the teal theme).
3. Replace the primitives and semantic tokens in src/index.css (light + dark), add `--font-heading`, radii, shadows,
   overlay/strike tokens; switch .btn, .seg and .nav buttons to pills, .card/.tbl-wrap/.action-card/.arch .layer to 20 px,
   .drawer to 28 px top-left/bottom-left; headings (.display-*, .h1–.h4, h1–h4) use `--font-heading`.
4. Add Lexend to index.html; replace public/favicon.svg; make the logo in src/App.tsx use tokens.
5. Map run status tones in RunView.tsx to the state meanings.
6. Run `npm test`, `node compass/check-spec.mjs`, `npm run build`; take light/dark screenshots of the main pages
   (Projects, Feature board, a feature stage, Agent runs, Release, Knowledge, Connections, Agent architecture) at desktop
   and phone width with Playwright and compare them with the Figma design system.
7. Set REQ-010…012 to In build and the automated TCs to Pass in spec.json; regenerate views with the portal's specFiles().

## Risks
- **Contrast:** honey is a light colour, so white text on it would be unreadable. `--color-text-on-brand` is dark ink in both
  modes and the contrast test (TC-015) covers every text token on every common background.
- **Brand vs accent look the same:** both are honey by design ("your turn"). Working/info moves to sky so "waiting for
  you" and "working" never look alike (TC-019).
- **Dark mode:** every semantic token gets a dark value; screenshots in dark mode are part of the proof.
- **Hidden hard-coded colours:** TC-017 scans src/ for hex/rgb colours outside the `:root` and `[data-theme="dark"]` token blocks.
  Exceptions, stated in the test: `src/framework.ts` (the starter stylesheet Compass writes into new apps — not portal UI) and
  `src/framework/` (files copied into other repos).
- **No new dependency:** only a Google Fonts family is added (same mechanism as today); package.json is unchanged (TC-022).
- **File limit:** 12 files including this plan and the generated views — at the guardrail limit, nothing else goes in.

## Proof
- `npm test`: TC-014, TC-015, TC-016, TC-017, TC-019 in tests/honeyTheme.test.mjs pass, plus all existing tests.
- `node compass/check-spec.mjs` and `node compass/check-guardrails.mjs origin/main` pass; `npm run build` succeeds.
- Light and dark screenshots of every page at desktop and phone width (TC-018, TC-020, TC-021) attached to the PR.
