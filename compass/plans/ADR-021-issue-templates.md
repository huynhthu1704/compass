# Plan: ADR-021 standard issue templates with Figma link, screenshot and requirement tables

Feature: none (framework process) · Requirements: none · Test cases: TC-004 (no drift)
Intent: Product Owner in chat on 2026-11-28 (quoted in ADR-021) · Design: none: templates and docs, no UI

## Files
- `.github/ISSUE_TEMPLATE/requirement.md`, `.github/ISSUE_TEMPLATE/bug.md` — the standard templates
- `src/framework/issue-requirement.md`, `src/framework/issue-bug.md` — the same templates as framework copies
- `src/framework.ts` — install the templates from those files (was inline strings) and add the issue rule to the AGENTS.md it writes
- `tests/noDrift.test.mjs` — the repo's templates must equal the framework copies (TC-004)
- `compass/design/README.md`, `src/framework/design-README.md` — new "Screenshots" section
- `AGENTS.md` — the issue rule; `compass/spec.json` — ADR-021

## Steps
1. Write the requirement template (Summary, Acceptance criteria table, Design with Figma link and screenshot, Requirement details table) and the bug template.
2. Move the portal's inline issue templates into `src/framework/` files imported with `?raw`, so the repo and every managed project get the same text; pin them with TC-004.
3. Document how screenshots are exported, named, committed and linked by SHA in the design README (both copies).
4. Add the rule to AGENTS.md and to the AGENTS.md the portal writes.

## Risks
- Projects the portal manages get the new templates only when the framework is (re)installed; existing repos keep theirs. Acceptable: templates are guidance, nothing checks issue bodies.
- A screenshot link by SHA breaks if the commit is garbage-collected; the README says to use a PR head or a commit on main, which GitHub keeps.
- The `?raw` import must keep the exact bytes; TC-004 compares the files and `npm run build` bundles them.

## Proof
- `npm test` (TC-004 no drift), `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build`, each run on its own.
