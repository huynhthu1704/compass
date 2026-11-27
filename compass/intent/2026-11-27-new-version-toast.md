# Intent: Tell the user when a new version of the portal is released

Status: Draft
Requested: 2026-11-27 by the Product Owner, in chat

## Business need
"add toast notification when new version is released in compass portal, similar to bee there website"

## What we want
Anyone with the Compass portal open learns, without having to guess, that a newer version has been deployed, and can
switch to it with one tap, the same way the Bee There website does it today: a small honey notice
"✨ A new version is available" with a **↻ Reload** button and a **✕** to dismiss it.

## Done when
- After a new version of the portal is deployed, a tab that was opened on the old version shows the notice within
  about 5 minutes, or as soon as the user comes back to the tab.
- **Reload** loads the new version and the user stays on the same page; **✕** hides the notice and the work on the
  page is untouched (the notice never reloads by itself, so nothing typed is lost).
- A tab that already runs the newest version never shows it; demo mode and local development keep working.

## Why
The portal is a single page that stays open for hours. After a release the open tab keeps running the old version,
so the Product Owner may test or approve with an outdated portal without knowing it. Bee There already solved this
(`src/lib/freshness.js`) and the Product Owner wants the same experience in Compass.

## Constraints
No server, no new library, no new paid service; works on GitHub Pages as deployed today. Honey look, light and dark
theme, phones and desktop. Checking must be light: one small request every few minutes, and only while the tab is open.

## Out of scope
Release notes or a "what's new" list in the notice; automatic reloading without asking; notifying users whose tab is
closed (e-mail or push).

## Requirements
<filled after approval>
