# Plan: REQ-081 the demo project shows the Travel Map Figma file for everyone

Feature: F-003 · Requirements: REQ-081 · Test cases: TC-531
Intent: compass/intent/2026-11-27-project-design-files.md · Design: compass/design/2026-11-27-project-design-files.md

## Why
The demo project lives in each browser only (REQ-040), so a Figma link saved in Project settings is not seen by anyone
else. The Owner asked (2026-11-28, in chat) that the demo always shows
https://www.figma.com/design/iT9WxxZFmyiz8HSWpg5E7K/Travel-Map---Demo-Compass for everyone.

## Files
- `tests/designLinks.test.mjs` — TC-531, committed first and failing.
- `compass/spec.json` — TC-531 under REQ-081.
- `src/demoOnce.ts` — `DEMO_FIGMA_FILE` and `withDemoDesignFiles()` (pure, so node:test runs it).
- `src/demo.ts` — new demo projects get `designTool: { kind: 'figma', url: DEMO_FIGMA_FILE }`.
- `src/store.ts` — demo projects already saved in a browser get the file when it loads, if they have no design files.

## Steps
1. Commit the plan, TC-531 and its spec entry; `npm test` fails on TC-531.
2. Add the constant and helper; use them in `demo.ts` and in the store's load.
3. `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs main`, build, check in the built app.

## Risks
- The link drops Figma's share tracking parameters (`p=f`, `t=…`); `node-id=0-1` keeps the same page.
- Someone who clears the Figma link in their demo gets it back on the next load (a demo has no design files → topped
  up). Acceptable for sample data; a demo with any design file of its own is never changed.
- Others see the preview only if the Figma file is shared as "Anyone with the link can view" (set in Figma).
- Real projects are never touched: the helper returns them unchanged (TC-531).

## Proof
- `npm test`: TC-531 fails at commit 1 and passes after the change.
- Built app: a fresh browser opens the demo → Project settings shows the link → F-001 Design previews it.
