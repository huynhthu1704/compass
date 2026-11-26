# Plan: REQ-016 … REQ-019 Delete a feature and close its GitHub issues

Feature: F-012 · Requirements: REQ-016, REQ-017, REQ-018, REQ-019 · Test cases: TC-029 … TC-038
Intent: compass/intent/2026-11-26-delete-feature.md · Design: compass/design/F-012.md (Figma SCR-1, SCR-2, SCR-3)

## Files
- compass/plans/REQ-016-019-delete-feature.md — this plan (first commit)
- src/deleteFeature.ts — new, pure (types-only imports, so Node runs it in tests): `canConfirmDelete` (exact id),
  `deleteSummary` (requirements, own and shared test cases, built requirements, open agent pull requests),
  `removeFeature` (spec + runs without the feature; shared tests and ADRs keep only other ids), `featureFiles`,
  `matchIssues` (title starts with the feature's REQ ids, lists and ranges included, or names the feature id; pull requests
  never), `deleteComment`, and `deleteFeature(p, fid, deps)`, which runs the whole delete with the GitHub calls injected
- src/github.ts — `openIssues` (open issues, pull requests filtered out, up to 300), `commentIssue`, `closeIssue`
  (state_reason `not_planned`); the 403 hint also names Issues
- src/components/DeleteFeatureDialog.tsx — new: the dialog of SCR-1/SCR-2/SCR-3 (what will be removed, red warning, typed
  id, Cancel/Delete) with focus kept inside, Esc to cancel; `DeleteNotice` for the board (mint or honey, links to issues
  still open)
- src/pages/Feature.tsx — "Delete feature" button next to "Archive feature"; opens the dialog
- src/pages/Overview.tsx — shows `DeleteNotice` after a delete
- src/pages/Connect.tsx — token help asks for Issues: Read & write
- src/index.css — dialog, backdrop, solid red button and notice styles from the honey tokens; phone layout below 720 px
- tests/deleteFeature.test.mjs — TC-029, TC-030 (logic part), TC-032 … TC-038 (TC-031 is a manual check)
- No spec status change in this PR (would regenerate four views and pass the 12-file limit); statuses move with the release,
  as in #28.

## Steps
1. Commit this plan.
2. Write tests/deleteFeature.test.mjs against the new module, then `src/deleteFeature.ts` until they pass.
3. Add the three GitHub calls to src/github.ts.
4. Build the dialog and the notice; wire the button on the feature page and the notice on the board; update the Connect help.
5. Order of a live delete: read open issues → build the new spec → read the repo tree → **one commit** on the default branch
   with compass/spec.json, its views and deletions of the feature's F-xxx.md files that exist → apply locally (spec, runs,
   not dirty) → comment on and close each matched issue, collecting refusals. Demo or no repo: apply locally only.
6. `npm test`, `node compass/check-spec.mjs`, `npm run build`, guardrails; Playwright screenshots of the dialog at 1440 px and
   390 px (demo project) compared with the Figma screens.

## Risks
- **The commit fails (offline, token):** nothing is deleted locally and the dialog shows the error, so the repo and the portal
  never disagree. Issue closing only starts after the commit, and a refusal there never undoes the delete (REQ-018).
- **Deleting the wrong issues:** `matchIssues` only takes titles that *start* with the feature's REQ ids (exact ids, ranges
  expanded) or name the feature id as a whole word; TC-035 covers look-alikes (`REQ-0160`, `Fix REQ-016 later`, pull
  requests). Issues are closed, never deleted, so a mistake can be reopened.
- **Auto-sync races the delete:** the delete commits directly and leaves the project not dirty, so a pending auto-sync finds
  nothing to commit.
- **A shared test or an ADR breaks check-spec:** `removeFeature` strips the deleted ids instead of keeping dangling ones;
  TC-032 checks the result with the rules of check-spec.
- **Pull requests of a built feature:** never closed or merged; only listed in the warning (TC-037).

## Proof
- `npm test`: TC-029, TC-030, TC-032 … TC-038 pass, plus all earlier tests.
- `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`, `npm run build` pass.
- Screenshots of the dialog (no code, with code, phone) and of the board notice in a demo project; TC-031 checked by hand
  with the keyboard at 390 px.
