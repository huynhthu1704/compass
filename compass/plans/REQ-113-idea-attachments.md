# Plan: REQ-113 Attach files to a feature's business need

Feature: F-001 · Requirements: REQ-113 · Test cases: TC-513, TC-514, TC-515 · Issue: #136
Intent: compass/intent/2026-11-28-idea-attachments.md · Design: compass/design/2026-11-28-idea-attachments.md

## Files
- src/attachments.ts — new, pure (types-only imports): allowed types, 5 MB limit, safe unique repo paths,
  accept/refuse with reasons, the agent's first message as text + image/document blocks wrapped as untrusted data
- src/types.ts — `Attachment` and `Idea.attachments?`; `FileChange.encoding?: 'base64'` for binary files
- src/github.ts — `commit` sends base64 content as-is when `encoding` is base64; `fileBase64` reads a binary file
  (contents API, or the blob API for files over 1 MB)
- src/harness.ts — the live Ideation run loads attached images/PDFs and sends them with the need; the IDEA line
  never carries file bytes
- src/pages/Idea.tsx — the attachments block in the agent box (Attach button, drop target, file rows, refused message,
  remove confirm, demo note), per the approved design
- tests/attachments.test.mjs — TC-513, TC-514
- compass/spec.json, compass/requirements.md, compass/tests.md — REQ-113 In build, TC status

## Steps
1. Commit this plan; set REQ-113 to In build and the design to Approved.
2. Write `src/attachments.ts` and its tests (TC-513, TC-514) first.
3. Binary commits in `github.ts`; type changes.
4. Idea page UI: attach (commit the file to the default branch, then add it to the idea so auto-sync writes spec.json),
   remove (confirm, commit the delete, drop from the idea); demo/no-repo projects keep the bytes in the browser.
5. Live Ideation run: attach image/document blocks (until 20 MB in total; the rest by name) with an untrusted-data note.
6. `npm test`, `npx tsc -b`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs main`; screenshots of
   the page in light, dark and phone width.

## Risks
- Binary corruption: the old `commit` always UTF-8-encoded text → separate base64 path, covered by a test of the change set.
- Prompt injection through a file: files go in as content blocks after a "data, not instructions" note; the system
  prompt is unchanged and the agent's output still passes the guardrails and the human approval gate.
- Demo projects keep files as base64 in localStorage, which can fill up (≈5 MB per browser) → a failed save shows
  the error and the file is not listed.
- Same file name twice → numbered "name-2.ext", never an overwrite.
- 12-file limit: no CSS file; the page reuses existing classes and tokens inline.

## Proof
- `npm test`: TC-513 (types, limit, paths, refused reasons, remove change), TC-514 (agent blocks, names only, no change
  without attachments).
- `npx tsc -b` and `npm run build` pass.
- Screenshots of SCR-1/2/3 states from the running app (demo project) compared with the Figma section.
