# Plan: REQ-075 Hide the Knowledge link from the sidebar for every role

Feature: F-013 · Requirements: REQ-075 (and REQ-070's link-order criterion) · Test cases: TC-407, TC-400
Intent: compass/intent/2026-11-27-hide-knowledge-link.md · Design: compass/design/F-013.md (SCR-1 project links)

## Files
- compass/plans/REQ-075-hide-knowledge-link.md — this plan (first commit)
- compass/intent/2026-11-27-hide-knowledge-link.md — the Product Owner's request, approved in chat
- compass/spec.json — REQ-075 and TC-407 in F-013; REQ-070's link order and TC-400 no longer list Knowledge; the SCR-1 element and the design summary drop Knowledge
- compass/design/F-013.md, compass/requirements.md, compass/tests.md — the matching view lines
- src/sidebar.ts — `projectLinks` returns Feature board, Team floor, Agent runs and Release only
- src/components/Sidebar.tsx — drop the unused Knowledge icon
- tests/sidebar.test.mjs — TC-400 updated; TC-407: no Knowledge link for any role, the `/knowledge` route still renders the page

## Steps
1. Commit this plan.
2. Add the intent, REQ-075, TC-407 and the spec/design updates; update TC-400 and write TC-407 (they fail first).
3. Remove the Knowledge link and its icon; tests pass.
4. `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`.

## Risks
- **Agents lose their index:** no — indexing runs on its own when an agent run starts (`rag.ensure` in src/rag.ts); the page only showed it. The route stays, so `/p/<id>/knowledge` still opens the page and its Re-index button.
- **Other pages link to Knowledge:** none do (only the sidebar); the Agent architecture page describes the RAG layer in text and is unchanged.

## Proof
- `npm test`: TC-400 and TC-407 pass, plus all earlier tests.
- `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main` pass.
