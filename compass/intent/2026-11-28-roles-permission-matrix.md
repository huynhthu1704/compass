# Intent: One roles and permission matrix for every part of Compass

Status: Draft
Requested: 2026-11-28 by the Product Owner, in chat: "the role and permission seem not work now, if I choose a role, I
don't see it different something with the other roles?", then "suggest a more comprehensive roles & permission matrix
for compass". The matrix below is the one the Product Owner answered "approve" to in chat on 2026-11-28, after choosing
"code review stays with developers", "let developers merge the PR" and "Merge stays live, and Release becomes the
version tag and release notes only … use '2'" ("the current project is built as experiment, no need for over
complicated workflow").

## Business need
"the role and permission seem not work now, if I choose a role, I don't see it different something with the other
roles?"

## What we want
Every role on a Compass team has a clear job, and what a person can do in the portal follows one matrix, everywhere:
on real projects with sign-in on, in the demo, and in a copy of Compass that runs with sign-in off. A person who picks
QA in the demo sees the QA buttons enabled and the others disabled with the reason, just as a QA on a real team does.

**Legend:** **A** approve the step (and edit it) · **E** edit and run the agent · **C** comment or quote for a
revision, no approval · **V** view only · **–** no access. A person with several roles can do what any of them allows.

### Pipeline (per feature)

| Step | PO | BA | UX | QA | Dev | DM | Ops |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Business need → intent | **A** | E | C | C | C | C | C |
| Requirements | **A** | **A** | C | C | C | C | C |
| Design | **A** | C | **A** | C | C | V | V |
| Test cases | C | C | V | **A** | C | V | V |
| Build (coding run, change set) | V | V | V | C | **A** | V | C |
| Code review | V | V | V | C | **A** ¹ | V | C |
| Merge PR (goes live) | V | V | V | V | **A** ² | V | C |
| Release (version tag and release notes) | **A** | V | V | C | C | **A** | E |
| Decisions (ADRs) | **A** | E | E | E | E | E | E |

¹ A Dev who started the build may approve its review; the review then shows a "Self-reviewed" badge, so one-Dev
projects keep working.
² Only after the code review is approved and CI is green. A merge to `main` deploys (AGENTS.md step 8); Release adds
the version tag and the release notes only. Undoing a change is a revert PR through Build → Code review → Merge.

### Features, project and workspace

| Action | PO | BA | UX | QA | Dev | DM | Ops | Admin | Super admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| View the board, runs, Team floor, release | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create a feature | ✅ | ✅ | – | – | – | – | – | – | ✅ |
| Archive or unarchive a feature | ✅ | – | – | – | – | ✅ | – | – | ✅ |
| Delete a feature (typed confirmation) | ✅ | – | – | – | – | – | – | ✅ | ✅ |
| Figma and Miro links (Project settings) | ✅ | – | ✅ | – | – | – | – | ✅ | ✅ |
| Guardrails and protected paths | – | – | – | – | C | – | E | **A** | ✅ |
| CI, deploy and GitHub Pages settings | – | – | – | – | C | – | ✅ | – | ✅ |
| Team page: add or remove people, change roles | – | – | – | – | – | – | – | ✅ | ✅ |
| Make someone a project Admin | – | – | – | – | – | – | – | ✅ | ✅ |
| Create or import a project | – | – | – | – | – | – | – | – | ✅ |
| Connections (shared GitHub token, Anthropic key) | – | – | – | – | – | – | – | – | ✅ |
| See every project | – | – | – | – | – | – | – | – | ✅ |
| Add or remove super admins | owner account only (REQ-046) |||||||||

Admin adds nothing in the pipeline: it is a management role held on top of a pipeline role.

### Rules everywhere
1. **One matrix in every mode.** In the demo and with sign-in off, the picked roles follow the matrix; nothing is
   written to Firebase or GitHub in the demo (REQ-040 AC3).
2. **Every disabled button says why**, e.g. "Needs the QA role".
3. **Super admin override:** a super admin can pass any gate; the approval is recorded as "super admin" and shown
   with an "Override" badge.
4. **The approval records the role that owns the gate** (REQ-036), as today.

## Done when
- In the demo and with sign-in off, each button in the matrix is enabled only for the picked roles that own it and
  otherwise disabled with "Needs the <role> role".
- With sign-in on, the same matrix decides what a team member can do on a real project, and the Firestore rules accept
  approval records only for the roles the pipeline table gives **A** (with new `review` and `merge` gates replacing
  today's `build` gate for the review step).
- Code review, merge and release are separate steps owned as above, with the "Self-reviewed" and "Override" badges.
- The feature, project and workspace actions follow the second table.

## Why
Today the role picked in the demo, or with sign-in off, changes almost nothing: every gate is open there
(`gatesApply()` in `src/team.ts`), so trying a role shows no difference. On real projects, Ops and Admin can approve
nothing, only Dev can approve a code review, any team member can delete a feature, and the role → gate table has no
place for merging or releasing on its own.

## Constraints
- **Which write path each rule guards:** the Firestore rules can refuse an approval record (REQ-037), so gate
  approvals are enforced there. Deleting or archiving a feature, editing guardrails and merging are commits made
  through the shared GitHub work token (ADR-016), which Firestore never sees: for those the portal disables the button,
  and the "Made in Compass by <email> (<role>)" line (REQ-042) is the trace, not a guarantee.
- `GATE_ROLES` in `src/team.ts` and `gateRoles()` in `firestore.rules` stay equal.
- With sign-in on, roles still come only from the team (ADR-014); the demo still reads and writes nothing in Firebase
  or GitHub.
- Keep it simple: the project is an experiment, so no preview environment, acceptance gate or rollback gate.

## Out of scope
- A read-only Viewer role, an acceptance gate on a preview, and a rollback gate.
- Requiring a reason for a super admin override, or blocking self-review.
- Changing the deploy workflow: a merge to `main` keeps deploying.
- Who may add or remove super admins (REQ-046 stays as it is).

## Requirements
<filled after approval>
