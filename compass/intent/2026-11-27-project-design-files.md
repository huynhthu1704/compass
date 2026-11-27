# Intent: Admins link a project's Figma file or Miro board in the portal

Status: Approved (by the Product Owner, 2026-11-27, in chat: "approve")
Requested: 2026-11-27 by the Product Owner, in chat

## Business need
"allow admin to map the figma file or miro file that use for specific project in the UI"

Answers given in chat (2026-11-27):
- A project holds **both** links, each optional: one Figma file and one Miro board.
- **Admin = the PO role for now.** It becomes the project Admin / super admin once Team access (F-015) is merged.
- The links are set on a new **Project settings** page (a sidebar link under Knowledge), not on the Feature board
  (the Product Owner's choice on 2026-11-27, ADR-012). Each feature's Design page shows them read-only.

## What we want
A project admin can set, on the project's Project settings page in the portal, which Figma file and/or Miro board a project's design work lives in. Everyone
on the project sees those links in one place: they can open them and preview them in the portal. The design agent
and the generated framework files point to them.

## Done when
- On a new Project settings page (sidebar → Project settings → "Design files" card), an admin adds, changes or removes the project's Figma file link and its Miro board link
  without editing `compass/spec.json` by hand. The portal checks that each link is a real figma.com or miro.com link.
- People who are not admins see the links and can open them, but cannot change them.
- The Design page focuses on the preview (Figma embed or Miro board embed); the links and their "Open ↗" buttons
  sit in a panel behind a "Design files" button.
- The links are saved to `compass/spec.json → designTool` (still readable by older portal versions and by
  `check-spec`), and the design agent's prompt and `AGENTS.md` name both tools.

## Why
Today the design tool link is an "anyone can change it" box on each feature's Design page. It accepts only one tool,
and Miro is not one of the choices. Teams that sketch flows in Miro and draw screens in Figma cannot link both, and
nothing stops a link from being changed by mistake.

## Constraints
- Browser-only, no server, no paid service, no new dependency (Figma and Miro embeds are plain iframes).
- "Admin" means the project Admin / super admin from Team access (F-015, intent `2026-11-27-team-access.md`). Until
  that is merged, the portal has no sign-in, so the edit control is limited to the PO role picked in the sidebar.
- Existing projects with a single `designTool` keep working with no change on their side.
- Honey design system, works on a phone and with the keyboard; UI text in English.

## Signal to watch
Number of projects with a Figma or Miro link set (no target).

## Out of scope
- Reading or writing Figma or Miro content through their APIs (no tokens).
- Per-feature links. Each feature's "This feature in …" frame link stays as it is.
- Other tools (Penpot, Sketch) beyond keeping the existing "Other" link.

## Requirements
- REQ-080 — The admin links the project's Figma file and Miro board on a Project settings page
- REQ-081 — Every Design page keeps the preview in focus and shows the design files behind a button
- REQ-082 — Projects with the old single design link keep working, and agents name both files
