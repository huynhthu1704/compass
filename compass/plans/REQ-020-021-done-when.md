# Plan: REQ-020, REQ-021 — "Done when" instead of invented targets

Feature: F-001 · Requirements: REQ-020 (#52), REQ-021 (#53) · Test cases: TC-039, TC-040, TC-041, TC-042
Intent: compass/intent/2026-11-27-done-when-before-targets.md · Design: compass/design/2026-11-27-done-when-labels.md
Decision: ADR-005 (same rule as travel-map ADR-021)

## Files
- `src/harness.ts` — Ideation agent prompt: "Done when", never invent a baseline, target, percentage or deadline;
  a metric only for a bet; optional signal to watch without a target. `save_idea` describes `outcomeMetric` as Done when.
  The offline draft moves out to `src/ideaDraft.ts`.
- `src/ideaDraft.ts` (new) — the offline draft (`demoIdea`, `demoBrief`) without "[baseline %] → [target %]"
  placeholders; types-only imports so node:test can run it (TC-040).
- `src/framework.ts` — installed AGENTS.md step 0b and the generated `features/F-xxx.md` / `intent/F-xxx.md` headings
  say "Done when".
- `AGENTS.md`, `compass/intent/README.md`, `src/framework/intent-README.md` — the same rule (the two READMEs stay
  identical, TC-004).
- `src/pages/Idea.tsx`, `src/components/RunView.tsx`, `src/rag.ts` — labels and help text per the approved design;
  the knowledge index labels the field "Done when" too (review nit on #61).
- `src/types.ts` — comment on `Idea.intent` / `outcomeMetric`.
- `tests/doneWhen.test.mjs` (new) — TC-039 … TC-042.

## Steps
1. Plan (this file).
2. Prompt and offline draft; framework text and READMEs; Idea page, run brief, generated files, RAG label.
3. Tests; `npm test`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build`.

## Risks
- Existing briefs keep the stored field `outcomeMetric` and their old text; only labels change, so nothing migrates.
  The Product Owner re-runs the Ideation agent where she wants a new brief (e.g. travel-map F-001).
- A need that itself contains numbers (e.g. "from 40% to 70%") keeps them: they are the Product Owner's own words,
  not invented. The offline draft shows them as a "Signal to watch (from the need)" next to Done when.
- The live model may still produce numbers; the prompt forbids it and the Product Owner approves every brief.
  TC-039 checks the prompt; a real run is checked by hand after merge (needs an API key).
- The demo project (`src/demo.ts`) keeps its sample metric texts; out of scope (12-file limit).

## Proof
- `npm test` (TC-039 … TC-042, TC-004 no-drift), `node compass/check-spec.mjs`,
  `node compass/check-guardrails.mjs origin/main`, `npm run build` (TypeScript).
