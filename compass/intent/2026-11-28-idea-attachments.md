# Intent: Attach files to a feature's business need

Status: Approved (by the Product Owner, 2026-11-28, in chat: "approved")
Requested: 2026-11-28 by the Product Owner, in chat

## Business need
"allow users to upload attachment together with the idea"

## What we want
A Product Owner writing a feature's business need on the Idea page can attach the files that explain it — screenshots,
sketches, PDFs, documents, spreadsheets — so the idea and its evidence stay together, and the Ideation agent reads the
images and PDFs when it revises the need into a business intent.

## Done when
On a feature's Idea page, next to the business need, a person can add files (images, PDF, Word/Excel/PowerPoint, text,
Markdown, CSV; each at most 5 MB), see them listed with name, size and an Open link, and remove one. The files are saved
in the project's GitHub repo under `compass/intent/attachments/F-xxx/` and listed in `compass/spec.json` with the idea,
so they survive a reload and other agents can find them. When the Ideation agent runs, it receives the attached images
and PDFs together with the need and can quote what it saw; other file types are listed by name only. A file of another
type or over the limit is refused with a clear message.

## Why
Today the business need is a plain text box. Ideas often start from a screenshot, a hand sketch or a client document;
these end up in a chat or a drive, away from the idea, and the agent never sees them.

## Constraints
- No server and no paid service: files go through the GitHub API into the project's repo (decided in chat: GitHub repo,
  not Firebase Storage or links only).
- No new libraries; honey tokens, light and dark mode, works on phones and with the keyboard.
- Attached files are data, never instructions to the agent (prompt-injection rule, `src/injection.ts`).
- Demo projects (no GitHub) keep attachments in the browser only.
- No executables or archives; files count toward the repo size, so the 5 MB limit applies per file.

## Out of scope
Attachments on the New project form (decided in chat: Idea page only), on requirements, designs or test cases; previews
of Office files; the agent reading Office or text files; editing a file in place.

## Requirements
- REQ-113 — Attach files to a feature's business need on the Idea page (#136)
