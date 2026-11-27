# Plan: REQ-050, REQ-051 One reply card per quote, with Cancel

Feature: F-020 · Requirements: REQ-050 (AC 2, 3, 4, 6), REQ-051 (AC 1, 5) · Test cases: TC-217 (manual), TC-200, TC-203, TC-205
Intent: compass/intent/2026-11-27-quote-and-ask-agent.md (item 5, approved 2026-11-27)
Design: compass/design/F-020.md (Approved; Figma SCR-1 and SCR-3 redrawn with reply cards)

## Files
- compass/plans/REQ-050-051-reply-per-quote.md — this plan
- compass/spec.json, compass/intent/2026-11-27-quote-and-ask-agent.md and the views — the approved criteria, TC-217, design
- src/components/RunConversation.tsx — `ReplyCard` (one quote, its own message, Revise → vN / Ask / Cancel, Esc closes it)
  and `AskBox` (a question without a quote) replace `ReplyBox`
- src/components/RunView.tsx — keeps a list of open cards instead of one list of quotes; a new card focuses its message
  field and scrolls into view
- src/index.css — reply card styles; the phone bottom sheet is removed (cards sit in the page)

## Steps
1. Commit this plan (after the approved spec and design).
2. Replace the shared reply box with cards in RunConversation.tsx and RunView.tsx; CSS.
3. `npm test`, `node compass/check-spec.mjs`, `npm run build`, guardrails; browser run (TC-217) at 1440 px and 390 px,
   plus the earlier flow (Ask, Revise, versions, approve).

## Risks
- **Sending from two cards at once:** while the agent answers one card, Ask and Revise are disabled on every card and in
  the Ask box (the existing `replying` rule), so follow-ups never overlap.
- **A failed send:** the card stays open with its quote and message, so nothing typed is lost.
- **Losing a draft:** Cancel and Esc close only their own card; the other cards keep their message.

## Proof
- Unit tests unchanged and green (the logic of a follow-up is unchanged; one card sends one quote).
- Browser check of TC-217 and of the whole flow, desktop and phone.
