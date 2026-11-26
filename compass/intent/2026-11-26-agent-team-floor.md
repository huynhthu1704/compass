# Intent: Watch the agent team work together, live

Status: Draft
Requested: 2026-11-26 by the Product Owner, in chat

## Business need
"recently, I see a few AI users they built a few creative team working with each other in a realtime movement user
interface. Can we apply this for compass"

## What we want
A **Team floor** page in the Compass portal that shows the seven agents as one team at work, in real time:
- each agent is a character at its own desk, labelled with the role it mirrors (PO, BA, UX, QA, Dev, DM)
- an agent that is working moves and shows what it is doing right now in a speech bubble (for example
  "Reading src/App.tsx", "Writing REQ-004")
- a handoff is shown as a card moving from one desk to the next (for example "REQ-003, REQ-004" from Requirements to
  Design), and a failed review sends the card back to the Coding agent
- when the team needs a human, the agent waits at a "Your approval" desk; one click opens the run to approve or reject

Today the only way to follow the team is the step list of each run, one run at a time; you cannot see at a glance who
is working, who is waiting for whom, or where a feature is stuck. Target: from the Team floor alone, the Product Owner
can tell within 5 seconds which agent is working, on which feature, and whether anything is waiting for her approval.

## Why
- The pipeline is already a team (Ideation → Requirements → Design → Test design → Coding → Review → Release) with
  handoffs and approval gates, but the portal shows it as separate text logs, so the team and its handoffs are hard to see.
- A live picture makes waiting approvals and stuck features obvious, and makes Compass easier to explain and demo.

## Constraints
- **A view only:** the scene is drawn from the run trace Compass already records (runs, steps, status, approvals).
  Agents keep working exactly as today: no change to what they do, their tools, guardrails or approval gates.
- **No extra cost:** no additional Claude calls or tokens; no paid service; no new libraries (CSS/SVG animation).
- **Browser only:** "live" means live in the browser tab that runs the agents; no server and no sharing across devices.
- Works in demo mode (no API key) with the same scene, so it can be tried without cost.
- Respects "reduce motion" settings (still picture instead of movement) and works on a phone-sized screen.
- At most 12 files per pull request; design drawn in Figma and approved before any code.

## Success measure
- The Product Owner can answer "who is working, on what, and is anything waiting for me?" from the Team floor alone.
- Every step of a run appears on the floor within 1 second of being recorded.
- Approving or rejecting from the floor gives the same result as from the run page.

## Out of scope (possible later steps, each needing its own decision)
- **Agents talking to each other** (for example the Reviewer asking the Coding agent a question and it answering):
  changes how the agents work, uses more Claude tokens per run and needs the approval gates rethought.
- Watching the same floor from several devices or with other people at the same time (needs a server or a paid
  realtime service).
- Sound, custom avatars, or a game-like world beyond the desks and handoffs.

## Design (Draft, for Product Owner approval)
Figma file "Compass — Team floor" (page "📐 Feature designs"; building blocks on "🧩 Components"):
- S1 Desktop · Live — https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=7-4
- S2 Desktop · Review sends work back — https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=10-124
- S3 Phone · Live — https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=12-237
- Design notes (data source, desk states, motion, reduced motion) — https://www.figma.com/design/79331aUkgSOKxR8y54x6fS?node-id=13-343

Once the requirements exist, this becomes the feature's design in `compass/spec.json`, with each screen traced to its REQ ids.

## Requirements
<filled after approval: REQ-xxx — title (#issue)>
