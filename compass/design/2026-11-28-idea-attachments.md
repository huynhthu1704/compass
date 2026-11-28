# Design: Attach files to a feature's business need

Status: Draft
Requirements: REQ-111
Design tool: Figma section "F-001 / REQ-111 · Idea attachments" — https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=306-1065 (component "Attachment / File row" on "🧩 Components": https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=305-106)

## Approach
The attachments sit inside the Ideation agent box on the Idea page, between the business need and "Revise into business
intent", so the files are clearly part of what the agent receives. One new component, **Attachment / File row**
(type mark, name, size and what the agent does with it, Open ↗, Remove), reuses the honey tokens, text styles and the
existing Button. The brief below the agent box does not change. No new libraries.

## Screens
### SCR-1 · Business need with attached files — REQ-111 (AC1, AC2, AC5)
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=306-1066
- Purpose: attach the files behind an idea and see what the agent will receive.
- Elements: "📎 Attach files" (secondary button, opens the file picker, several files at once); help text "Images, PDF,
  Word, Excel, PowerPoint, text, Markdown, CSV · up to 5 MB each · or drop files here"; one file row per attachment —
  type mark (PNG, PDF, XLSX…), name, size and "the agent reads it" (images, PDF) or "the agent sees its name only"
  (other types), "Open ↗" (new tab, the file in the repo) and "Remove"; a note under the button that files go to the
  agent as data, never as instructions.
- States: see SCR-2.

### SCR-2 · States — REQ-111 (AC2, AC3, AC4, AC6)
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=306-1115
- A · Dragging files over the agent box: dashed brand border, "Drop files to attach them to this business need".
- B · Saving: the row shows "Saving to GitHub…" and no Open until the commit is done.
- C · Refused: a danger box "N files were not added" with one line per file and the reason ("this type is not
  allowed", "over 5 MB (7.8 MB)"); the allowed files of the same drop are still added.
- D · Remove: pressing Remove turns the row into "Remove <name>? It is deleted from the repo." with Remove (danger) and
  Cancel.
- E · Empty: only the Attach button and the help text.
- F · Demo project: rows say "kept in this browser only (demo)".

### SCR-3 · Phone (390 px), dark theme — REQ-111 (AC7)
- Frame: https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=306-1159
- The same agent box; the help text wraps under the button and the row text wraps, Open and Remove stay on the row.
- Keyboard: Attach, Open and each Remove are reachable with Tab and work with Enter; Escape cancels a remove.

## Notes
- Files are stored at `compass/intent/attachments/<F-xxx>/<safe-name>` in the project's repo and listed with the idea
  in `compass/spec.json` (name, path, type, size). A second file with the same name gets " (2)".
- The agent gets images as image blocks and PDFs as document blocks, wrapped as untrusted data (`src/injection.ts`).
