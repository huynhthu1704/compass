# Intent: Admins link a project's Figma file or Miro board in the portal

Status: Draft
Requested: 2026-11-27 by the Product Owner, in chat

## Business need
"allow admin to map the figma file or miro file that use for specific project in the UI"

Answers given in chat (2026-11-27):
- A project holds **both** links, each optional: one Figma file and one Miro board.
- **Admin = the PO role for now.** It becomes the project Admin / super admin once Team access (F-015) is merged.
- The links are set in the **project settings**. Each feature's Design page shows them read-only.

## What we want
A project admin can set, from the portal, which Figma file and/or Miro board a project's design work lives in. Everyone
on the project sees those links in one place: they can open them and preview them in the portal. The design agent
and the generated framework files point to them.

## Done when
- In the project's settings, an admin adds, changes or removes the project's Figma file link and its Miro board link
  without editing `compass/spec.json` by hand. The portal checks that each link is a real figma.com or miro.com link.
- People who are not admins see the links and can open them, but cannot change them.
- The Design page shows the linked file (Figma embed or Miro board embed) and an "Open ↗" button for each tool.
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
<filled after approval>
