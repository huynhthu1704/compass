# Intent: Delete a feature from the Compass portal, and close its GitHub issues

Status: Approved (by the Product Owner, 2026-11-26, in chat)
Requested: 2026-11-26 by the Product Owner, in chat

## Business need
"Allow me to delete a feature directly from compass portal. The corresponding github ticket should also be deleted."

Answers given in chat (2026-11-26):
- GitHub issues are **closed as "not planned"** with a comment, not permanently deleted. Permanent deletion needs repo
  admin rights and cannot be undone.
- **Any feature** can be deleted, including one that is built or released, with a strong warning when it has code.
- **Everything for the feature** is removed: the feature, its requirements and test cases, its generated files and its
  agent runs.
- The delete is confirmed by **typing the feature id** (e.g. `F-012`).

## What we want
1. **Delete from the feature page.** Next to "Archive feature", a "Delete feature" button opens a dialog. The dialog
   lists what will be removed: the requirements, test cases, files and open GitHub issues. You confirm by typing the
   feature id.
   Target: a feature added by mistake is gone in under 30 seconds, without editing `spec.json` by hand.
2. **The spec and the repo stay consistent.** The feature, its requirements (REQ ids with this `featureId`), their test
   cases and the feature's agent runs are removed. Decisions (ADRs) are kept as history; only the deleted REQ ids are
   taken out of their `reqIds`. The next spec
   commit deletes `compass/intent/F-xxx.md`, `compass/features/F-xxx.md` and `compass/design/F-xxx.md`.
   Target: `node compass/check-spec.mjs` passes after the deletion, and no file of the deleted feature is left in the repo.
3. **Its GitHub tickets are closed.** Every open issue whose title starts with one of the feature's REQ ids (the
   `REQ-xxx: …` convention), or that names the feature id, is closed as *not planned*. Each one gets a comment saying the
   feature was deleted in Compass, with the date. If GitHub refuses (token without Issues permission, no repo), the
   feature is still deleted and the portal shows which issues are still open, with links.
   Target: 0 open issues of the deleted feature remain, or a list of the ones still open is shown.
4. **A strong warning for built features.** When any requirement is In build or Done, the dialog says in red that code
   and tests in the repo still reference those REQ ids and must be cleaned up in a separate change. Open agent pull
   requests of the feature are listed too.

## Why
Today a feature can only be archived. A feature created by mistake, or a duplicate, stays on the board and in
`spec.json` for good, and its requirement issues stay open on GitHub. Removing it means hand-editing `spec.json` and
closing issues one by one.

## Constraints
- No new libraries and no server: the portal calls the GitHub REST API from the browser with the existing token. The
  token needs **Issues: Read & write** (the Connect page and the error hint say so).
- Demo projects and projects without a repo delete locally only.
- Deletion is a guardrail action (`requireHumanApprovalFor: delete`): typing the feature id counts as the human approval.
  Merged code, tests and pull requests are never deleted or closed automatically.
- Honey design system; dialog works on a phone; keyboard accessible (Esc cancels, focus stays in the dialog).

## Success measure
In a test project: delete a feature that has 2 requirements, 3 test cases and 2 open issues → the board no longer shows
it, `spec.json` has none of its ids, its three `F-xxx.md` files are deleted in the next sync commit, and both issues are
closed as *not planned* with a comment. Unit tests cover the spec clean-up and the issue matching.

## Out of scope
- Permanently deleting GitHub issues (GraphQL `deleteIssue`, admin only).
- Removing code, tests or branches of a built feature; closing its pull requests.
- An undo or trash bin (Archive remains the reversible option).

## Requirements
Feature F-012 · Delete a feature and close its GitHub issues
- REQ-016 — Delete a feature from its page after typing its id (#32)
- REQ-017 — Deleting a feature removes everything that belongs to it (#33)
- REQ-018 — The deleted feature's open GitHub issues are closed as not planned (#34)
- REQ-019 — A strong warning before deleting a feature that has code (#35)
