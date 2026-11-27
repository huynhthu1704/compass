# Design: Project design files — the admin links a Figma file and a Miro board

Status: Approved (by the Product Owner, 2026-11-27, in chat: "approve")
Requirements: REQ-080 (#78), REQ-081 (#79), REQ-082 (#80)
Design tool: Figma — section "REQ-080–REQ-082 · Project design files (F-003)" on the page "📐 Feature designs":
https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-978

## Approach
A new **Project settings** page, opened from a gear link at the end of the sidebar's project group (ADR-015),
holds a **Design files** card with two optional links, a Figma file and a Miro board. Only the admin sees edit fields: with sign-in on, the project's Admin or the super admin (Team access, F-015); with
sign-in off (demo, local use), the PO role picked in the sidebar.
Everyone else sees each link as a row with the tool's mark, the link and **Open ↗**. Each feature's Design page
drops today's editable "Project design tool" box so the page focuses on the **preview**: the Figma embed (the
feature's frame link, else the project file) or the Miro live embed. A **Design files** button at the top right, next to
the page title, opens the links in a side panel (a bottom sheet on a phone); above the preview there is only the
switch, when both tools are linked.
Storage: `compass/spec.json → designTool` keeps `kind` + `url` (so older portals and `check-spec` still read it) and
gains an optional `miroUrl`. A project with only a Miro board stores `{ kind: "miro", url }`. An older portal shows that link under an unknown tool name but keeps it (it
only reads and writes `kind` and `url`); the Figma rule accepts https links on figma.com and www.figma.com.

## Screens
### SCR-0 · Sidebar · Project settings link — REQ-080
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=173-103
- Elements: "⚙ Project settings" as the last link of the project group, for every role: after Release, and after
  Team access's Admin-only "Team" link (REQ-075 removed Knowledge); honey fill when it is the
  current page; same icon size, focus ring and hover as the other links.

### SCR-1 · Desktop · Project settings, admin edits design files — REQ-080, REQ-082
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-979
- Elements: card title "Design files", badge "compass/spec.json → designTool", one-line help, fields *Figma file*
  and *Miro board* side by side (monospace input, help line under each), **Save** (accent) and **Cancel** (ghost),
  a note that clearing a field removes the link and that an existing single link is kept.
- States: empty (placeholders), filled, **error** (red border + "Paste a Miro board link: https://miro.com/app/board/…"
  or "A figma.com design, file, proto or board link"; nothing is saved), saved (back to the read-only rows of SCR-2
  plus a **Change** button).
- The team and the GitHub token stay on Team access's own Team page (ADR-015).

### SCR-2 · Desktop · Project settings, not the admin — REQ-080
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-1011
- Elements: one row per linked tool (mark F/M, "Figma file" / "Miro board", the link, **Open ↗** in a new tab) and
  the hint "Only the project admin can change the design files."
- States: both or one linked.

### SCR-2b · State · nothing linked — REQ-080, REQ-081
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=180-102
- The same card with "No design files linked yet." (not the admin). The admin sees the empty fields of SCR-1.

### SCR-3 · Desktop · Design page, preview in focus, Design files top right — REQ-081, REQ-082
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-1039
- Elements: no design-files card. **🔗 Design files** with a count pill at the top right of the page head (the
  PageHead's right slot). Above the preview only the switch *Figma preview / Miro preview* (when both are linked).
  Preview full page width × 600 (Figma embed, or Miro live embed `https://miro.com/app/live-embed/<board id>/`).
- States: none linked → button "Design files · none" and the preview area says "No design files linked yet"; an old
  project with a Penpot/Sketch/Other link has no preview; its link is in the Design files panel.

### SCR-3b · Desktop · Design files side panel open — REQ-081
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=186-111
- Elements: 420 px panel from the right over a light scrim: title "Design files", ✕, one row per tool with **Open ↗**,
  "Change in Project settings →" (admin only; others read "Only the project admin can change the design files.").
- Behaviour: Esc, ✕ or a click outside closes it; focus moves into the panel on open and back to the button on close.

### SCR-4 · Phone · Design page — REQ-081
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-1079
- Elements: **🔗 Files** (count) at the top right next to the title; the switch above a full-width preview.

### SCR-4b · Phone · Design files bottom sheet — REQ-080, REQ-081
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=186-169
- Elements: bottom sheet with grabber, title, the two rows with **Open ↗**, and a full-width "Change in Project
  settings →" for the admin. On Project settings (sidebar menu) the admin's two fields stack and **Save** sits under them.

## Notes
- Accessibility: the panel is a dialog labelled "Design files"; every row's **Open ↗** has an aria-label "Open the Figma file in a new tab" / "…the Miro board…";
  the preview switch is a tab list (arrow keys); field errors are linked with aria-describedby; focus ring on all.
- Embeds are plain iframes from figma.com and miro.com (no token, no new dependency); links are checked before saving.
- Colours, type and radii use the Compass variables and text styles (light and dark modes).
