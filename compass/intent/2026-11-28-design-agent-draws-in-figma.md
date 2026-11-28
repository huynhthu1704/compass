# Intent: The Design agent draws the feature's screens in Figma for review

Status: Approved (by the Product Owner, 2026-11-28, in chat: "Approve the intent")
Requested: 2026-11-28 by the Product Owner, in chat

## Business need
"For design stage, what I expect is that the system will generate the figma design screens based on the requirement
list, and allow me to review it."

Answers given in chat (2026-11-28):
- **Spike first:** before any requirement, test that Compass can reach Figma's MCP server and draw one real F-001
  screen (result below).
- **Include the auto-chain:** approving the design starts the Test design agent.
- **Route:** first "Let go with MCP". After the connection test showed that Figma lets only approved apps use its MCP
  server, the Product Owner chose **"go with 2b": a Compass Figma plugin with the Design agent inside**.
- The earlier answer "one Figma connection per project" no longer applies: a plugin draws as the person who runs it,
  with their own Figma seat.
- **Claude key:** the plugin uses **the project's shared Anthropic key** (REQ-041), not a personal one. So the plugin
  signs in to Compass, and every person who can run it can read that key on their own machine.
- **Links back:** asked "can it auto paste to compass". Yes: the same Compass sign-in gives the plugin the shared
  GitHub work token the portal already uses (ADR-016), so the plugin saves the frame links to `compass/spec.json`
  itself. Nobody pastes anything.

## What we want
Once a feature's requirements are approved, the Product Owner and UX review real screens in Figma, drawn by the
Design agent from those requirements and built from the project's design system, instead of a text description that
someone has to draw by hand first.

## Done when
- The Design agent in the portal still drafts the design from the approved requirements (as today). Each screen is
  also saved in a structured form the plugin can draw from: its sections and the elements in each one (fields,
  buttons, lists, badges, text), with the REQ ids it delivers, its states and sample content.
- A designer or the Product Owner opens the project's Figma file and runs the **Compass** plugin, picks the feature,
  and starts drawing. The plugin's Design agent (Claude, called from the plugin) draws every screen with a small set
  of drawing tools. It uses component instances from the file's Components page, the file's variables and its text
  styles, never loose copies or raw colours.
- The plugin puts all of a feature's screens in one section on the feature-designs page, named
  `<F-xxx / REQ ids> · <topic>`, and any new reusable part on the Components page (the rule in
  `compass/design/README.md`).
- After drawing, the agent exports each screen as an image, checks it against the design (clipped text, overlaps,
  wrong layout, placeholder text), fixes what it finds, and stops after a set number of fix rounds.
- The plugin signs in to Compass. Only members of the project's team can use it, and only UX, PO or Admin can start
  a drawing run. It then uses the project's shared Anthropic key and saves each screen's frame link and the section
  link to `compass/spec.json → features[].design` itself, through the shared work token. Nobody pastes links. The
  Design page shows the drawn section in its preview.
- "Redesign" in the portal updates the saved design. Running the plugin again redraws only the screens that changed,
  found by their stable names, and leaves every other frame alone.
- If the plugin is not installed or a drawing run fails, the design is still saved as a Draft, and the manual path
  (draw, link, approve) still works.
- Approving the design starts the Test design agent, as approving the last requirement starts the Design agent.

## Why
Today the Design agent writes screens as text. A person has to draw every frame in Figma and paste each link before
the design can be approved, so the Design stage waits on drawing time and the screens often drift from the
requirements' wording.

## Constraints
- **This changes an earlier constraint:** intent `2026-11-27-project-design-files.md` put "writing Figma content"
  out of scope. This needs an ADR. Compass itself stays browser-only with no server. The plugin is a second small
  app in this repository, with its own build and tests.
- The plugin runs in Figma's plugin sandbox. Its network access is limited in its manifest to the hosts it needs
  (the Claude API and GitHub). Claude's API accepts calls from a plugin's page (checked: a CORS preflight with
  `Origin: null` returns `access-control-allow-origin: *`).
- The plugin's tools write only inside the feature's own section and on the Components page. They never delete a
  frame the plugin did not draw. The model cannot run arbitrary code: every action is one of the plugin's tools.
- Keys are never committed, logged or written to `compass/spec.json` or into the Figma file. The plugin keeps the
  shared Anthropic key and work token in memory for the run only, never in Figma's plugin storage, which is "private
  for stability, not security".
- **What the sign-in guards:** Firestore rules decide who can read the shared key and work token (REQ-041). They do
  not see the plugin's GitHub commits (ADR-016), and they do not see what it draws in Figma (Figma's own file
  permissions do). The role check before a drawing run is a plugin check, like the portal's.
- The approval gate does not change: UX or the PO approve in the portal, and coding stays locked until then.
- Drawing needs a Full Figma seat outside your drafts. UI text in English. The plugin's panel follows the Honey design
  system.

## Spike result (2026-11-28)
- **Drawing: proven.** From a Claude Code session (through its own Figma connection), the agent drew F-001 SCR-1
  "Idea brief with Done when" (REQ-020, REQ-021) in section
  [F-001 / REQ-020, REQ-021 · Done when on the Idea brief](https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=340-1176).
  It used the file's colour and size variables, its text styles and its Badge and Button components. It made one new
  component, "Idea / Brief field", on the Components page, and placed instances of it. It took about ten Figma calls:
  five reads, three writes and two screenshots. It checked its own screenshot and fixed two layout defects (one
  column instead of two, a stray white fill) before showing the result. The plugin's tools must make the same steps
  possible.
- **Figma's MCP server is closed to Compass (connection test, 2026-11-28).** Registering Compass as a new MCP client
  returned **403 Forbidden** from Figma; calls without a token or with a personal access token return 401. Figma's
  docs: "Only clients listed in the Figma MCP catalog, such as VS Code, Cursor, and Claude Code, can connect to the
  Figma MCP server. If you're a developer who wants to connect a new MCP client, join the waitlist." This is why the
  plugin route was chosen.

## Risks
- **Signing in to Compass from inside Figma.** A plugin page has no web origin, so the portal's Google sign-in popup
  cannot run there as it is. The first requirement must settle how the plugin signs in (for example, a one-time code
  shown in the plugin and confirmed in the portal) without a Compass server.
- **Installing the plugin on a Professional plan.** Private team plugins may need Figma's Organization or Enterprise
  plan (not yet checked). Otherwise each person loads it once as a development plugin in the Figma desktop app.
- **Quality from a small tool set.** The plugin's tools are fewer than the full Plugin API the spike used. The first
  build must show it can redraw the spike screen at the same quality.
- **Cost and time:** drawing 6–10 screens is many Claude turns, plus image checks.

## Signal to watch
Time from "requirements approved" to "design approved" per feature (no target).

## Out of scope
- Creating or changing the design system itself (tokens, components). The agent only uses what the file has, plus new
  reusable parts a screen needs.
- Prototype links, animations and Miro boards.
- Publishing the plugin to the Figma Community.
- Turning Figma frames into code (Code Connect). That is the Coding agent's stage.

## Requirements
<filled after approval>
