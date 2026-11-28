# Design: Sidebar account card and account menu

Status: Approved (by the Product Owner, 2026-11-28, in chat: "Remove try the demo in this section, the rest is fine to proceed" — on the mockup of states A, B and C)
Requirements: REQ-110
Design tool: Figma section "F-013 / REQ-110 · Account menu" — https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=284-1015 (components on "🧩 Components": https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=278-105)

## Approach
The footer keeps its place at the bottom of the 248 px sidebar, above a thin line. It reuses the sidebar's side-card
(letter avatar, name, chevron replaced by ⋯), the honey chip style and the existing tokens; the menu is a small
popover (surface, border, elevation-2, radius-md) that opens upward inside the sidebar width.

## Screens
### SCR-1 · Footer, signed in — REQ-110
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=284-1016
- Purpose: see who is signed in and their roles on the open project, at a glance.
- Elements: round honey avatar with the initial; name (the part of the email before "@", cut off with … and the full
  email as tooltip); chips: "Super admin" (super admin) and one chip per role on this project (e.g. "PO"); ⋯ icon.
- States: hover = border; menu open = brand border; keyboard focus = focus ring; no project open or no roles → only
  the "Super admin" chip, or a neutral "Google" chip.

### SCR-2 · Account menu open — REQ-110
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=284-1043 (dark: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=284-1095)
- Purpose: reach the account actions from one place.
- Elements (top to bottom): header with the name and the full email (wraps, never cut off); "Connections" with
  "GitHub ✓" or "Not connected" on the right; "Dark theme" with an on/off switch; a line; "Sign out" in the danger colour.
  In the demo, "Leave demo" sits above the line. **No "Try the demo"** (Product Owner, 2026-11-28).
- States: opens on click, Enter or Space; arrow keys move between items; Escape, a click outside or a choice closes it
  and returns focus to the card.

### SCR-3 · Footer in the demo, or with sign-in off — REQ-110
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=284-1146
- Purpose: pick the role to look through.
- Elements: the role picker row (label "Role" / "Demo role" + select) above the card; in the demo the card shows a
  "Demo · <role>" chip. The page's own demo banner keeps "Leave demo", so the footer has no second demo strip.
- Sign-in off: the card shows "@user · GitHub connected" or "Not connected · Demo mode"; the menu has Connections and
  the theme switch, no Sign out.

### SCR-4 · Phone (below 900 px) — REQ-110
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=284-1175
- The same footer inside the Menu drawer; the menu opens in place above the card (in the page flow, so it is never cut off at the top of the drawer), within the drawer width.

## Notes
- Dark mode uses the same tokens (SCR-2 in dark is drawn in Figma).
- Replaces the footer of F-013 SCR-1/SCR-2 (REQ-073 AC2: role picker + theme button row); see ADR-019.
