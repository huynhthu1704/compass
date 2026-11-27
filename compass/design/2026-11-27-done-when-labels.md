# Design: "Done when" instead of "Outcome metric" on the Idea page and briefs

Status: Approved (by the Product Owner, 2026-11-27, in chat)
Requirements: REQ-021 (#53)
Design tool: none: text-only change, no new layout. The Product Owner reviews the before/after wording below
(agreed in chat on 2026-11-27 that a text note is enough).

## Approach
Only labels, help text and headings change. Layout, components, colours and the stored field (`outcomeMetric` in
`compass/spec.json`) stay the same, so existing briefs keep their text and nothing needs migrating.

## Screens
### SCR-1 · Idea page (stage 1) — REQ-021
- Purpose: the Product Owner reads and edits the brief the Ideation agent drafted.
- Elements (before → after):
  | Where | Before | After |
  |---|---|---|
  | Agent box hint | "…revises your business need into a measurable business intent (outcome, baseline → target), finds users, scope and risks…" | "…revises your business need into a business intent (who, what changes) and what will be true when it is done, finds users, scope and risks…" |
  | Intent field label | Business intent (measurable outcome) | Business intent |
  | Intent field help | Who, what changes, baseline → target, by when — not the solution. | Who, what changes — not the solution. |
  | Metric field label | Outcome metric (baseline → target) | Done when (and optional signal to watch) |
  | Metric field help | — | What will be true when it is done. Add a signal to watch only if useful; a target only for a bet, after real data. |
- States: unchanged (empty field shows the help text; saved text shows as typed).

### SCR-2 · Agent run brief (Agent runs › Ideation) — REQ-021
- Purpose: the Product Owner approves the brief the agent proposed.
- Elements: the line "**Outcome metric:** …" becomes "**Done when:** …"; nothing else changes.
- States: unchanged.

### SCR-3 · Generated files `compass/features/F-xxx.md` and `compass/intent/F-xxx.md` — REQ-021
- The heading "## Outcome metric" (features) and "## Success measure" (intent) become "## Done when".

## Notes
- No new colours or components; accessibility and phone layout are unchanged.
- The Ideation agent's own wording (no invented numbers) is REQ-020, which has no UI.
