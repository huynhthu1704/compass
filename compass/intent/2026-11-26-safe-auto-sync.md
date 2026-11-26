# Intent: Auto-sync never overwrites a newer spec on GitHub

Status: Approved (by the Product Owner, 2026-11-26, in chat)
Requested: 2026-11-26 by the Product Owner, in chat

## Business need
"Fix the cause in Compass: before auto-sync commits, it should check that main hasn't changed since the portal last
read it. If it has, it should stop and ask instead of overwriting." (approved in chat; "start the fix after restore")

## What happened
On 2026-11-26 the portal's auto-sync committed its local copy of Bee There's spec, last read on 2026-11-23, straight
onto `main` (huynhthu1704/travel-map c137068, 621db06). 107 requirements, 88 test cases and 20 decisions became 1, 4
and 0. Agents had changed the spec on `main` in the meantime. The portal never compared its copy with GitHub before it
committed. It also stores the wrong id after a commit: the commit's id instead of the file's version (`specSha`), so it
could not have noticed the change anyway. Restored in huynhthu1704/travel-map#140.

## What we want
1. **Check before every spec commit.** Before auto-sync (or "Commit spec") writes `compass/spec.json`, the portal reads
   the file's current version on the default branch. If it is not the version the portal last read or wrote, nothing is
   committed.
   Target: 0 spec commits made on top of a version the portal has not seen.
2. **Stop and ask.** Auto-sync pauses for that project, and a banner says that GitHub has a newer spec, with the time
   and author of the latest change. Two choices:
   - **Load GitHub's version.** My unsaved portal edits are dropped. The default, safest choice.
   - **Keep both (merge by id).** Items on GitHub stay, my new and edited items are added on top, and a short summary of
     what changes is shown before it is committed. If the same item was edited on both sides, GitHub's version wins and
     the item is listed.

   Overwriting GitHub with the portal's copy is not offered.
3. **Fresh copy on open.** When a project with no unsaved edits is opened, the portal loads the latest spec from GitHub
   first, so an old copy is never the starting point.
4. **Safety net.** Even when the versions match, auto-sync refuses a commit that would remove requirements, test cases
   or decisions the user did not delete in the portal (deleting a feature, F-012, counts as deleting). It shows the
   same banner instead.
   Target: a repeat of the 2026-11-26 incident is blocked by both 1 and 4 (unit tests replay it).

## Why
The portal is meant to be one of several writers of `compass/spec.json` (portal, agents, people), but it behaves as if
it were the only one. One stale browser tab erased a project's whole traceability.

## Constraints
- Browser only, existing GitHub REST API and token; no new libraries.
- Demo projects and projects without a repo are unchanged.
- The banner follows the honey design system and works on a phone.

## Success measure
Unit tests replay the incident: a portal copy from 2026-11-23 against today's `main` → no commit, banner shown, and
"Keep both" keeps all 107 requirements. `specSha` is the version of `compass/spec.json` after a commit and after a pull.

## Out of scope
- Real-time collaboration or locking.
- Merging generated views by hand (they are always regenerated from the merged spec).
- Restoring other projects (only Bee There was affected; already restored).

## Requirements
Feature F-013 · Auto-sync never overwrites a newer spec on GitHub (requirements in Draft, waiting for approval)
- REQ-020 — The portal checks GitHub's version before every spec commit
- REQ-021 — When GitHub has a newer spec, the portal stops and asks
- REQ-022 — Opening a project loads the latest spec from GitHub first
- REQ-023 — A spec commit never removes items quietly
- REQ-024 — A design tool stored as a plain link is read correctly (folded in with the Product Owner's OK)
