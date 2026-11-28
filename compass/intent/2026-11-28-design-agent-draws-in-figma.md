# Intent: The Design agent draws the feature's screens in Figma for review

Status: Draft
Requested: 2026-11-28 by the Product Owner, in chat

## Business need
"For design stage, what I expect is that the system will generate the figma design screens based on the requirement
list, and allow me to review it." Then, choosing between a Figma plugin and the Figma MCP server: "Let go with MCP".

Answers given in chat (2026-11-28):
- **Spike first:** before any requirement, test that Compass can reach Figma's MCP server and draw one real F-001
  screen.
- **One Figma connection per project:** an Admin connects Figma once for the project, like the shared Anthropic key,
  and every design run uses it.
- **Include the auto-chain:** approving the design starts the Test design agent.

## What we want
Once a feature's requirements are approved, the Product Owner and UX review real screens in Figma, drawn by the
Design agent from those requirements and built from the project's design system, instead of a text description that
someone has to draw by hand first.

## Done when
- When the last requirement of a feature is approved, the Design agent drafts the screens (as today). It then draws
  them in the project's Figma file, through the Figma MCP server, in one section on the feature-designs page named
  `<F-xxx / REQ ids> · <topic>`. It uses component instances from the file's Components page and the file's variables,
  never loose copies.
- Each screen in `compass/spec.json → features[].design` gets its frame link, and the feature's design links the
  section. Nobody pastes links by hand.
- The Design page shows the drawn section in its preview. The reviewer can approve, or ask for changes in words
  ("Redesign"), and the agent redraws only the frames that change.
- If Figma is not connected, or a drawing step fails, the text design is still saved as a Draft. The page says what
  failed, and the manual path (draw, link, approve) still works.
- Approving the design starts the Test design agent, as approving the last requirement starts the Design agent.

## Why
Today the Design agent writes screens as text. A person has to draw every frame in Figma and paste each link before
the design can be approved, so the Design stage waits on drawing time and the screens often drift from the
requirements' wording.

## Constraints
- **This changes an earlier constraint:** Compass is browser-only with no server, and intent
  `2026-11-27-project-design-files.md` put "writing Figma content through its API" out of scope. This needs an ADR.
- The portal calls Claude from the browser. The Claude API's MCP connector (beta) lets that same request use the
  Figma MCP server, so no Compass server is added if Figma accepts the connection (see Risks).
- A Figma credential must never be committed, logged or written to `compass/spec.json`. One connection per project,
  stored like the shared Anthropic key (REQ-041), and only the project Admin or the super admin can connect or remove
  it. Drawings are made under that Figma account, whoever starts the run.
- The agent writes only to the project's linked Figma file, only in its own feature's section and on the Components
  page. It never deletes frames it did not draw.
- The approval gate does not change: UX or the PO approve, and coding stays locked until then.

## Spike result (2026-11-28)
- **Drawing: proven.** From this Claude Code session (through its own Figma connection), the agent drew F-001 SCR-1
  "Idea brief with Done when" (REQ-020, REQ-021) in section
  [F-001 / REQ-020, REQ-021 · Done when on the Idea brief](https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=340-1176).
  It used the file's colour and size variables, its text styles and its Badge and Button components. It made one new
  component, "Idea / Brief field", on the Components page, and placed instances of it. It took about ten Figma calls:
  five reads, three writes and two screenshots. It checked its own screenshot and fixed two layout defects (one
  column instead of two, a stray white fill) before showing the result.
- **Access from Compass: not proven yet.** The spike used Claude Code's Figma connection, signed in as the Product
  Owner. It does not show that the portal's own Claude API call can reach Figma's MCP server with a token that
  Compass holds. That is the next step.

## Risks to settle first (a spike before any requirement)
- **Can a third-party app use Figma's remote MCP server?** Figma may accept only approved MCP clients and only OAuth
  sign-in. This was not verified (Figma's docs could not be reached from this session). If it is closed to Compass,
  the fallback is a small Figma plugin that draws from the saved design (option A in chat).
- Which Figma plan and seat drawing through MCP needs.
- Cost and time per feature: drawing 6–10 screens is many tool calls.

## Signal to watch
Time from "requirements approved" to "design approved" per feature (no target).

## Out of scope
- Creating or changing the design system itself (tokens, components). The agent only uses what the file has.
- Prototype links, animations and Miro boards.
- Turning Figma frames into code (Code Connect). That is the Coding agent's stage.

## Requirements
<filled after approval>
