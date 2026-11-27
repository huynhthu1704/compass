# Plan: REQ-050 … REQ-054 Quote an agent answer and ask for details or a revision

Feature: F-020 · Requirements: REQ-050, REQ-051, REQ-052, REQ-053, REQ-054 · Test cases: TC-200 … TC-103
Intent: compass/intent/2026-11-27-quote-and-ask-agent.md · Design: compass/design/F-020.md (Figma SCR-1 … SCR-4)

## Files
- compass/plans/REQ-050-054-quote-and-ask.md — this plan (first commit)
- src/types.ts — `Quote`, `ConvTurn`, `RunVersion`; `Run.conversation`, `Run.versions`, `Run.replying` (all optional, so
  stored runs load unchanged)
- src/injection.ts — new, pure: the prompt-injection pattern and `findInjection`, moved out of guardrails.ts so the
  conversation module and its tests can use the same rule
- src/guardrails.ts — `scanInjection` uses `findInjection` (same behaviour)
- src/conversation.ts — new, pure (types-only imports, Node runs it in tests): quote sources and item text,
  `selectionSource` (only inside the answer of a finished run), `canSend`, `canRevise`, `followUpPrompt` (goal, proposal,
  change set, conversation, quotes inside `<quoted_text>` markers, message — no repository chunks), `scanReply`,
  `mergeProposal` / `mergeChanges` (a revision is a delta: quoted items change, ids kept, new items get the next free id,
  everything else stays deep-equal), `changeSummary` ("Proposal v2 — changed: REQ-051 · AC 2, src/app.ts"), demo answer
  and demo revision
- src/harness.ts — `replyToRun(pid, rid, kind, quotes, message)`: Ask (one Claude call, no tools) or Revise (revise_* tools
  that return only changed/new items, or propose_file_change for code), then the guardrails and evals run again through
  one shared `evaluate` step (also used by `startRun`); demo mode without a key; versions v1…vN kept on the run
- src/components/RunConversation.tsx — new: quote blocks, reply box (Revise → vN, Ask, hint, disabled states), the
  conversation thread with version markers, the version picker and the compare view
- src/components/RunView.tsx — the answer is quotable: `data-quote-source` on every item and AC line, a "❝ Quote" pill per
  item, the floating Quote button for a selection; shows the version being read; the approval card names the version
- src/index.css — quote blocks, pill, floating button, thread, version picker, compare; reply box sticks to the bottom on
  phones (< 720 px)
- tests/conversation.test.mjs — TC-200, TC-201, TC-203 … TC-209, TC-210, TC-102 (TC-202, TC-101, TC-103 are manual)
- No spec status change in this PR (as in #37, it would regenerate the views and pass the 12-file limit).

## Steps
1. Commit this plan.
2. Write tests/conversation.test.mjs, then src/injection.ts and src/conversation.ts until they pass.
3. Types, then `replyToRun` and the shared `evaluate` in the harness.
4. RunConversation.tsx and the RunView changes; CSS from the honey tokens.
5. `npm test`, `node compass/check-spec.mjs`, `npm run build`, guardrails; Playwright in a demo project: quote a selection
   and an item, Ask, Revise, compare, approve v2; screenshots at 1440 px and 390 px compared with the Figma screens.

## Risks
- **A revision silently changes items that were not quoted:** the model returns only changed or new items and the merge
  copies every other item from the previous version, so they stay deep-equal (TC-206, TC-207). Removing an item is not
  supported by Revise (out of scope); the agent says so in its answer.
- **Prompt injection through quotes or the message:** both are wrapped as data (`<quoted_text>`, `<message>`, closing tags
  in the text are neutralised), scanned with the same rule as retrieved context, and a warning is shown in the trace
  (TC-102). Tools stay limited to the agent's save tools; nothing is written before a human approves.
- **Approving an old version:** the run's `proposal` / `changes` always hold the latest version; earlier versions are
  read-only snapshots (TC-210).
- **Token cost:** a follow-up sends the run's goal, proposal, change set (quoted files in full, others by path) and the
  conversation — no new repository index; tokens are shown per answer.
- **Stored runs from before this change:** all new fields are optional; v1 is snapshotted at the first revision.
- **Phone long-press:** the browser's own selection menu cannot be extended, so the Quote button appears just under the
  selection; every item also has a 44 px Quote pill.

## Proof
- `npm test`: TC-200, TC-201, TC-203 … TC-210, TC-102 pass, plus all earlier tests.
- `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build` pass.
- Screenshots of SCR-1 … SCR-4 states in a demo project; TC-202, TC-101, TC-103 checked by hand (keyboard, 390 px,
  reload, Runs page, deleting the run).
