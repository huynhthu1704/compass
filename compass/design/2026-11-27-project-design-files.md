# Design: Project design files — the admin links a Figma file and a Miro board

Status: Draft
Requirements: REQ-080 (#78), REQ-081 (#79), REQ-082 (#80)
Design tool: Figma — section "REQ-080–REQ-082 · Project design files (F-003)" on the page "📐 Feature designs":
https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-978

## Approach
The project page (Feature board) gets a **Design files** card next to *Repository & framework*. It holds two optional
links, a Figma file and a Miro board. Only the admin (the PO role until Team access, F-015, is merged) sees edit fields.
Everyone else sees each link as a row with the tool's mark, the link and **Open ↗**. Each feature's Design page
replaces today's editable "Project design tool" box with a read-only **Project design files** card and a preview: the
Figma embed (the feature's frame link, else the project file) and the Miro live embed. When both are linked, a
switch picks which preview shows.
Storage: `compass/spec.json → designTool` keeps `kind` + `url` (so older portals and `check-spec` still read it) and
gains an optional `miroUrl`. A project with only a Miro board stores `{ kind: "miro", url }`.

## Screens
### SCR-1 · Desktop · Project page, admin edits design files — REQ-080, REQ-082
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-979
- Elements: card title "Design files", badge "compass/spec.json → designTool", one-line help, fields *Figma file*
  and *Miro board* side by side (monospace input, help line under each), **Save** (accent) and **Cancel** (ghost),
  a note that clearing a field removes the link and that an existing single link is kept.
- States: empty (placeholders), filled, **error** (red border + "Paste a Miro board link: https://miro.com/app/board/…"
  or "A figma.com design, file, proto or board link"; nothing is saved), saved (back to the read-only rows of SCR-2
  plus a **Change** button).

### SCR-2 · Desktop · Project page, not the admin — REQ-080
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-1011
- Elements: one row per linked tool (mark F/M, "Figma file" / "Miro board", the link, **Open ↗** in a new tab) and
  the hint "Only the project admin can change the design files."
- States: both, one, or none linked ("No design files linked yet.").

### SCR-3 · Desktop · Design page — REQ-081, REQ-082
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-1039
- Elements: "Project design files" card with the same rows, no edit fields; "Change on the project page →" for the
  admin only; preview switch *Figma preview / Miro preview* (only when both are linked); the preview (Figma embed
  360 px high, Miro live embed `https://miro.com/app/live-embed/<board id>/`).
- States: none linked → "No design files linked yet" (admin: link to the project page); an old project with a
  Penpot/Sketch/Other link shows that row with its tool name and no preview.

### SCR-4 · Phone · Design files and preview — REQ-080, REQ-081
Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=170-1079
- Elements: the same card full width, links shortened with an ellipsis, the switch, and a preview that fits the
  screen width. On the project page, the admin's two fields stack and **Save** sits under them.

## Notes
- Accessibility: every row's **Open ↗** has an aria-label "Open the Figma file in a new tab" / "…the Miro board…";
  the preview switch is a tab list (arrow keys); field errors are linked with aria-describedby; focus ring on all.
- Embeds are plain iframes from figma.com and miro.com (no token, no new dependency); links are checked before saving.
- Colours, type and radii use the Compass variables and text styles (light and dark modes).
