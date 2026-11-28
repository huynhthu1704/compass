# Plan: REQ-076 Remove the Knowledge page

Feature: F-013 · Requirements: REQ-076 (and REQ-075's second criterion, replaced) · Test cases: TC-408, TC-407
Intent: compass/intent/2026-11-27-hide-knowledge-link.md (update of 2026-11-28) · Design: compass/design/F-013.md (no screen change)

## Files
- compass/plans/REQ-076-remove-knowledge-page.md — this plan (first commit)
- compass/intent/2026-11-27-hide-knowledge-link.md — the Product Owner's follow-up decision (2026-11-28)
- compass/spec.json — REQ-076 and TC-408; REQ-075 loses the "page still opens" criterion and TC-407 its route check; the honey-theme criterion and TC-028 no longer list a Knowledge page
- compass/requirements.md, compass/tests.md — the matching view lines
- src/App.tsx — drop the `knowledge` route and the page import; the address falls through to the Feature board (OverviewPage)
- src/pages/Knowledge.tsx — deleted (needs the Product Owner's OK: a deletion)
- src/rag.ts — drop `indexedAt`, used only by the deleted page
- src/pages/Import.tsx — the comment no longer points to "Re-index on Knowledge"
- tests/sidebar.test.mjs — TC-407 without the route check; TC-408: no Knowledge page or route, agents still index

## Steps
1. Commit this plan.
2. Intent update, REQ-076, TC-408 and the spec/view edits; update TC-407 and write TC-408.
3. Remove the route, the page and `indexedAt`; fix the Import comment; tests pass.
4. `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- **Agents lose their index:** no — `rag.ensure` (src/harness.ts) builds it on an agent run when it is missing, and Import still indexes at import. Only the manual "Re-index" button goes; reloading the browser clears the in-memory index so the next run re-reads the repository.
- **Old bookmarks to /knowledge:** they open the Feature board (the default project page), not an error.
- **Deletion:** CI's guardrails check needs the `human-approved` label; the merge waits for the Product Owner.

## Proof
- `npm test`: TC-407 and TC-408 pass, plus all earlier tests.
- `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main` pass; a preview build shows the Feature board at `/#/p/<id>/knowledge`.
