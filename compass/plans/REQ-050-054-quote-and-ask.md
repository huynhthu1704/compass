# Plan: REQ-050 … REQ-054 Quote an agent answer and ask for details or a revision

Feature: F-020 · Requirements: REQ-050, REQ-051, REQ-052, REQ-053, REQ-054 · Test cases: TC-200 … TC-213
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
- src/followUp.ts — new: `replyToRun(pid, rid, kind, quotes, message)`: Ask (one Claude call, no tools) or Revise
  (revise_* tools that return only changed/new items, or propose_file_change for code), then the guardrails and evals
  run again; demo mode without a key; versions v1…vN kept on the run. Its own file keeps harness.ts under 600 lines.
- src/harness.ts — one shared `evaluate` step (used by `startRun` and by revisions); the helpers followUp.ts needs are exported
- src/components/RunConversation.tsx — new: quote blocks, reply box (Revise → vN, Ask, hint, disabled states), the
  conversation thread with version markers, the version picker and the compare view
- src/components/RunView.tsx — the answer is quotable: `data-quote-source` on every item and AC line, a "❝ Quote" pill per
  item, the floating Quote button for a selection; shows the version being read; the approval card names the version.
  Item header and eval rows wrap, and the two run columns become one below 900 px (the inline grid style kept two
  columns on phones, which the conversation made unreadable)
- src/index.css — quote blocks, pill, floating button, thread, version picker, compare; reply box sticks to the bottom on
  phones (< 720 px)
- tests/conversation.test.mjs — TC-200, TC-201, TC-203 … TC-209, TC-210, TC-212 (TC-202, TC-211, TC-213 are manual)
- tests/doneWhen.test.mjs — TC-042 (REQ-021) read the old one-line Markdown brief in RunView; the brief now labels each
  (quotable) field through `ideaLabel`, so the check asserts `ideaLabel('outcomeMetric')` is "done when" and that RunView uses
  it. Its "no Outcome metric anywhere" check is unchanged.
- No spec status change in this PR (as in #37, it would regenerate the views and pass the 12-file limit).

## Steps
1. Commit this plan.
2. Write tests/conversation.test.mjs, then src/injection.ts and src/conversation.ts until they pass.
3. Types, then `replyToRun` and the shared `evaluate` in the harness.
4. RunConversation.tsx and the RunView changes; CSS from the honey tokens.
5. `npm test`, `node compass/check-spec.mjs`, `npm run build`, guardrails; Playwright in a demo project: quote a selection
   and an item, Ask, Revise, compare, approve v2; screenshots at 1440 px and 390 px compared with the Figma screens.

## Risks
- **A revision silently changes items that were not quoted:** the model returns only changed or new items, and
  `scopeDelta` enforces it: every revised item, idea field, design text or existing file that was not quoted is refused
  (told to the agent in the tool result and to the reviewer in the answer) before the merge, which copies every other item
  from the previous version, so they stay deep-equal (TC-206, TC-207). A revision that changes nothing makes no new
  version (review of #69). Removing an item is not
  supported by Revise (out of scope); the agent says so in its answer.
- **Prompt injection through quotes or the message:** both are wrapped as data (`<quoted_text>`, `<message>`, closing tags
  in the text are neutralised), scanned with the same rule as retrieved context, and a warning is shown in the trace
  (TC-212). Tools stay limited to the agent's save tools; nothing is written before a human approves.
- **Approving an old version:** the run's `proposal` / `changes` always hold the latest version; earlier versions are
  read-only snapshots (TC-210).
- **Token cost:** a follow-up sends the run's goal, proposal, change set (quoted files in full, others by path) and the
  conversation — no new repository index; tokens are shown per answer.
- **A revised version approved before its checks ran:** `canApprove` refuses a revised version without guardrail
  results (the page closed while they ran); the button and `approveRun` both check it, and revising again re-runs them
  (TC-208, second review of #69).
- **A reload during Ask or Revise:** `replying` is stored with the run, but it counts only while this page is waiting for
  that run (`activeReply` with an in-memory set), so an interrupted follow-up never blocks Approve, Reject, Ask or Revise
  (TC-213, review of #69).
- **Stored runs from before this change:** all new fields are optional; v1 is snapshotted at the first revision.
- **Phone long-press:** the browser's own selection menu cannot be extended, so the Quote button appears just under the
  selection; every item also has a 44 px Quote pill.

## Proof
- `npm test`: TC-200, TC-201, TC-203 … TC-210, TC-212 pass, plus all earlier tests.
- `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build` pass.
- Screenshots of SCR-1 … SCR-4 states in a demo project; TC-202, TC-211, TC-213 checked by hand (keyboard, 390 px,
  reload, Runs page, deleting the run).
