# compass/design/ — an approved design before any code

The design shows **how** the approved requirements will look and behave, before anyone writes code. It is drawn in
the project's one design tool (e.g. Figma; the link is in `compass/spec.json → designTool`) and described here so
that agents and reviewers can read it without opening the tool.

## Two kinds of design file
- `compass/design/F-xxx.md` — **written by the Compass portal** from `compass/spec.json → features[].design`.
  Edit the design in the portal (or in spec.json), not the file.
- `compass/design/YYYY-MM-DD-short-topic.md` — **written by an agent or a designer** for requirements that are not
  designed in the portal, from the template below. The requirement points to it with
  `"design": "compass/design/<file>.md"` in `compass/spec.json`. A change without any UI says so explicitly:
  `"design": "none: <reason>"`.

## Flow
1. Every requirement of the change is **Approved** → draft the design (`Status: Draft`): one section per screen,
   each listing the REQ ids it delivers, its elements and its states (empty, loading, error, success).
2. Draw it in the design tool and paste each frame link. Show it to the Product Owner.
   **Figma file layout:** every component (component or component set) lives on the file's "Components" page —
   never on a feature, prototype or brand page; move one there when you create or find it, and leave an instance
   where it was shown. All screens of one feature go in **one Figma section** on the feature-designs page, named
   `<F-xxx / REQ ids> · <topic>`, and the design links that section.
3. The Product Owner approves → `Status: Approved (by <name>, <date>)`. **Only then may code start**:
   `node compass/check-spec.mjs` fails when a requirement is In build or Done while its design is not Approved.
4. If the design must change during the build, set it back to Draft, update it and get it approved again.

## Screenshots
Every requirement issue shows the screens it delivers (`.github/ISSUE_TEMPLATE/requirement.md`):
1. Export the screen's frame from the design tool as PNG (in Figma: the frame linked in the design, at its 1× size).
2. Commit it as `compass/design/screens/F-xxx-SCR-n.png` (the feature and screen ids from the design) in a pull request.
3. In the issue, link it by that commit's SHA so the image never changes or breaks:
   `https://github.com/<owner>/<repo>/raw/<commit-sha>/compass/design/screens/F-xxx-SCR-n.png`. Use the head of an
   open pull request (GitHub keeps it) or the commit on `main` once merged, never a branch without a pull request.
   This works in issues when the repository is public, or for readers who can see a private one.
4. When the design changes, export again, commit, and update the link in the issue.

## Template
```markdown
# Design: <short title>

Status: Draft
Requirements: REQ-xxx, REQ-yyy
Design tool: <link to the feature's section in Figma…>

## Approach
<layout, navigation, components and styles reused>

## Screens
### SCR-1 · <name> — REQ-xxx
- Purpose: <what the user does here>
- Elements: <key components and content>
- States: <empty · loading · error · success>
- Frame: <link>

## Notes
<accessibility, phone layout, open questions>
```
