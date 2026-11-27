# Intent: only permitted people create projects, and only in our GitHub account

Status: Draft
Requested: 2026-11-27 by the Product Owner, in chat (after team access went live)

## What we want
With sign-in on, a person can bring a new project into Compass only when the super admin allows it:
- The super admin can always import a repository or create a new project.
- The super admin can give a person the permission **"Can create projects"** on a new **Users** screen (only the super
  admin sees it, and only the super admin grants or removes the permission).
- A person with that permission can create a **new GitHub repository**, but only in the GitHub account or organization
  the super admin configured, using a **creator token** the super admin set. They become the Admin of the new
  project's team.
- Nobody else sees "Import from GitHub", "+ New project" or a personal GitHub token box; they see "Ask the super admin
  to add a project". Team members always work through the project's token, set by the project Admin.
- Project Admins keep managing their own project's team and token.
- With sign-in off, or in the demo, nothing changes.

## Done when
- A signed-in team member without the permission sees no Import, no New project and no GitHub token box, and Compass
  never uses a personal GitHub token for a team project.
- A person with the permission creates a project: the repository appears in the configured account or organization,
  and its team lists them as Admin.
- Only the super admin can grant the permission, set the account/organization and the creator token; the Firestore rules
  refuse anyone else.

## Why
After team access went live, any signed-in member could still paste their own GitHub token, import their own
repositories or create new ones through Compass. Nothing leaked (only the super admin can create a project's team), but
the buttons were there and half worked. The Product Owner wants project creation controlled by the super admin.

## Constraints
- Free Firebase Spark plan; no server code (ADR-010). The rules are the security boundary.
- The creator token can create repositories in the configured account, and every permitted person's browser can read it
  (as with project tokens, ADR-011). It must be a fine-grained token limited to that account/organization, with an expiry.
- `firestore.rules` changes need the Product Owner's review and publishing in the Firebase console.
- Compass cannot stop anyone using GitHub directly; it controls only what Compass offers.

## Out of scope
- Creating repositories in a person's own GitHub account.
- Project Admins granting "Can create projects".
- Moving the Anthropic key to the project (decided separately; see below).

## Open question for the Product Owner
- Anthropic key on Connections: (A) keep it per person (recommended: their own cost; without it agents run in demo
  mode), or (B) super admin only.

## Requirements
<filled after approval>
