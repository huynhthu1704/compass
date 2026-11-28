# Intent: A version number and version history in the portal

Status: Draft
Requested: 2026-11-28 by the Product Owner, in chat

## Business need
"add version tracking number for this portal" — then: "add version history similar to 'bee there' https://beetheremap.com/#/"

## What we want
Everyone using the Compass portal can see which version they are on and what changed in each version, the same way
Bee There does: a version line at the bottom of the sidebar, and a "What's new" page listing every release, newest
first.

## Done when
- The bottom of the sidebar, under the account card, shows a small grey line such as
  `Compass v1.0.0 · build 142 · 2686b3d`; hovering it shows the deploy date and time.
- The release number (`v1.0.0`) is set by hand in `package.json` with each release; the build number and the short
  commit id are added automatically by every deploy (a local or demo build shows `dev` instead).
- Clicking the version line opens **What's new**: "Version you're using: v1.0.0", then the releases grouped by day,
  newest first, each with its version tag and short entries (icon, title, one or two sentences). The release you are
  on is marked "Current".
- A small dot on the version line tells you a release you have not opened yet exists; opening What's new clears it.
- The first entry, v1.0.0 (2026-11-28), summarises what the portal already does (the features F-001 … F-020).
- A test fails when `package.json`'s version has no matching entry in the release history.

## Why
Today nothing in the portal says which version is live, so nobody can tell whether a fix has been deployed or what
changed since their last visit. Bee There already solves this and people know the pattern.

## Constraints
Honey tokens only, light and dark mode; no new libraries; the phone menu keeps working; keyboard friendly. No change
to the deploy workflow (a protected path): the build number comes from the variables GitHub Actions already sets
during `npm run build`. No change to what is stored in Firestore (the "seen" dot is kept in the browser only).

## Related
The draft intent `compass/intent/2026-11-27-new-version-toast.md` (F-021, branch `compass/f-021-new-version-toast`) shows a
"new version available" notice with Reload. It can reuse this version number; the two do not depend on each other.

## Out of scope
Git tags and GitHub Releases for the portal (AGENTS.md step 8, separate change); images in release entries;
Vietnamese text; a version history for the projects Compass manages.

## Requirements
<filled after approval>
