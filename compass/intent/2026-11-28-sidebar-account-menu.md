# Intent: A tidy account section at the bottom of the sidebar

Status: Approved (by the Product Owner, 2026-11-28, in chat: "Remove try the demo in this section, the rest is fine to proceed")
Requested: 2026-11-27 by the Product Owner, in chat (with a screenshot of the sidebar footer marked in red)

## Business need
"redesign the bottom section"

## What we want
Every signed-in person sees one calm account card at the bottom of the sidebar — who they are and their roles on the
open project — and finds Connections, the theme and Sign out in one small menu behind that card, instead of four loose
rows of buttons and text.

## Done when
The footer shows one account card (initial, name, role chips) and nothing else, except the role picker where people pick
a role (sign-in off, or in the demo). Clicking the card opens a menu with the full email, Connections, the theme switch,
Leave demo (in the demo) and Sign out. The role is shown once, the email is never cut off in the menu, and "Try the demo"
is no longer in the sidebar.
_Changed by ADR-020 and ADR-027 (2026-11-28): with sign-in on, Connections is only for super admins, and the demo menu has no Connections._

## Why
Today the footer stacks the account card, "Try the demo" and "Sign out" buttons, a "My roles" line and a lone theme
button: the email is cut off, the role is shown twice and the theme button sits alone on its own row.

## Constraints
Honey tokens only, light and dark mode; no new libraries; the phone menu keeps working; keyboard friendly. No change to
sign-in or to what is stored.

## Out of scope
Showing the Google display name (needs a sign-in change), a profile page, "Try the demo" anywhere in the sidebar (it stays
on the "You have no access yet" screen).

## Requirements
- REQ-110 — The sidebar footer is one account card that opens an account menu
