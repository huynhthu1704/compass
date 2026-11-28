# Design: Version line and What's new

Status: Draft
Requirements: REQ-111, REQ-112
Design tool: Figma section "F-022 / REQ-111, REQ-112 · Version and What's new" — https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=309-1134 (components on "🧩 Components": "Sidebar / Version line" https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=306-1208 and "What's new / Entry" https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=307-106)

## Approach
Follows Bee There's pattern (version shown in the app, a "What's new" list of releases grouped by day, newest first,
with the current one marked) in the Compass honey design. The version line is one small row under the REQ-110 account
card at the bottom of the 248 px sidebar (Body/Small, text/tertiary). It reuses the existing tokens, the Button (Ghost)
for Close and the Account / Chip tones for the version tag (brand) and "Current" (success). What's new is a 520 px
dialog (surface, border, radius 16, shadow) over a dimmed page. No new library.

**Proposed change to REQ-111's wording:** the line reads `v1.0.0 · build 142 · 2686b3d` without the word "Compass".
With "Compass" it is 221–236 px wide and only ~193 px is free next to the dot in the 248 px sidebar, so the commit id
would be cut off; the sidebar brand right above already says "Compass". Needs the Product Owner's OK.

## Screens
### SCR-1 · Version line — REQ-111, REQ-112
- Frames: light, new release, hover https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=309-1136 ·
  dark, no new release https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=309-1165
- Purpose: see which version is live; open What's new.
- Elements: `v<release> · build <n> · <7-character commit>` (local build: `v<release> · dev`), cut off with … if ever
  too long; a 7 px honey dot on the right while the newest release was not opened in this browser (accessible name
  "new release").
- States: hover = subtle background and a tooltip "Built 28 Nov 2026, 10:43" (also on keyboard focus); focus ring;
  click, Enter or Space opens What's new; the dot is gone after What's new was opened. Same line with sign-in off, in
  the demo and signed in.

### SCR-2 · What's new — REQ-112
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=309-1227
- Purpose: read what changed in each version.
- Elements (top to bottom): "✨ What's new" + Close (ghost button); a honey box "Version you're using · v1.0.0 · build
  142"; per day a heading "📅 Saturday, 28 November 2026"; per release its tag chip `v1.0.0` and, for the release you
  are on, a "Current" chip; its entries (What's new / Entry: icon, title, one or two sentences). Releases and days
  newest first; the dialog body scrolls when long.
- First release v1.0.0 (2026-11-28): From idea to release in one place · An agent team you can watch · Quote and ask ·
  Team access · The honey look.
- States: opens with focus on Close; Escape, Close or a click on the dimmed page closes it and returns focus to the
  version line.

### SCR-3 · Phone (below 900 px) — REQ-111
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=309-1191
- The same line under the account card inside the Menu drawer, within the drawer width; What's new fills the screen
  width minus 16 px on each side.

## Notes
The release history lives in the code next to `package.json`'s version; a unit test fails when the version has no
entry (REQ-112 AC4). The "seen" mark is kept in the browser only (no Firestore change).
