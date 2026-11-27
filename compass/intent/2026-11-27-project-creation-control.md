# Intent: each person works with their own GitHub token; only permitted people create projects

Status: Approved (by the Product Owner, 2026-11-27, in chat: asked to reply "approve, A" or "approve, B", they replied "B")
Requested: 2026-11-27 by the Product Owner, in chat (after team access went live; revised the same day: "should we ask
the user to connect with their github account to use their own token so the system can have a clear audit trace")

## What we want
With sign-in on:
- **Every GitHub change has a real author.** A team member saves to GitHub, approves agent changes or releases with
  **their own** fine-grained GitHub token, connected on the Connections page and limited to the project's repository.
  GitHub then shows the real person on each commit and pull request. Without a token they can still view everything, and
  Compass says "Connect your GitHub account to make changes".
- **Who is who:** when a person connects, Compass records their GitHub username next to their email on the project's
  team, so the super admin and the Admins can match people to GitHub accounts.
- **The shared project token is retired** (reverses ADR-011): the Team page no longer has a project token, the stored
  token is deleted, and Compass never uses one person's token for another person's work.
- **Project creation is controlled:** only the super admin, and people the super admin marks **"Can create projects"** on
  a new **Users** screen (only the super admin sees it and grants or removes the permission), see "Import from GitHub"
  and "+ New project". A permitted person creates the repository with their own token, and only in the GitHub account
  or organization the super admin configured. They become the Admin of the new project's team. Everyone else sees
  "Ask the super admin to add a project".
- **The Anthropic key is for the super admin only** (option B): only the super admin sees and uses it on Connections; for
  everyone else agents run in demo mode.
- Compass keeps its own approval records in Firebase, so each approval is traceable twice: in Compass and on GitHub.
- With sign-in off, or in the demo, nothing changes.

## Done when
- A commit or pull request made through Compass on a team project shows the person who clicked as its author on GitHub.
- A team member without a token can view but not change anything on GitHub, and is told how to connect.
- The Team page shows each member's GitHub username once they have connected; there is no project token any more.
- A member without "Can create projects" sees no Import and no New project. A permitted person creates a repository
  only in the configured account or organization, and its team lists them as Admin.
- Only the super admin can grant "Can create projects" and set the account or organization; the Firestore rules refuse
  anyone else.

## Why
Today every GitHub change made through Compass on a team project shows the shared token's owner, whoever clicked, so
GitHub's history cannot say who did what. The shared token is also readable by every member's browser (ADR-011) and
must be replaced whenever someone leaves. Separately, any signed-in member could still paste a token and import or create
repositories. Personal tokens give a clear audit trail, remove the shared secret, and keep each person within their own
GitHub permissions.

## Constraints
- Free Firebase Spark plan; no server code (ADR-010). The Firestore rules are the security boundary for Compass data;
  GitHub's own permissions are the boundary for repositories.
- Each team member needs a GitHub account and must be added by the repository owner as a collaborator. Compass guides
  them with a short checklist; it cannot invite people on GitHub for them.
- `firestore.rules` changes need the Product Owner's review and publishing in the Firebase console.
- Retiring the project token removes a live feature (REQ-034) and deletes stored tokens: the Product Owner approves it here.
- Compass cannot stop anyone using GitHub directly; it controls only what Compass offers.

## Out of scope
- A "Connect with GitHub" button (OAuth) instead of pasting a token: logged on the backlog, #111.
- Project Admins granting "Can create projects".
- Creating repositories outside the configured account or organization.

## Requirements
- REQ-041 — GitHub work on a team project uses the person's own GitHub token; the Anthropic key is the super admin's only
- REQ-042 — The team shows each member's GitHub username
- REQ-043 — The shared project token is retired
- REQ-044 — Only the super admin and people they permit create projects, only in the configured GitHub account
