# Intent: phase 1 — everyone works through the super admin's GitHub token and Anthropic key; only permitted people create projects

Status: Draft
Requested: 2026-11-27 by the Product Owner, in chat. Revised the same day; the last word: "the intention is that everyone
will use my personal token for action and changes in the first phase. So the github and anthropic token should only be
configured by me"

## What we want
With sign-in on, in phase 1:
- **One GitHub token and one Anthropic key, set only by the super admin**, on Connections. Compass uses them for every
  person's GitHub work and live agent runs on team projects. The Connections page is hidden from everyone else, and a
  token or key that someone saved on their own device is never used for a team project.
- **Project Admins no longer set a project token.** The per-project token card on the Team page is removed and stored
  project tokens are deleted (the super admin's token replaces them).
- **A clear audit trail anyway:** every commit and pull request Compass makes says who did it ("Made in Compass by
  <email> (<role>)"), next to Compass's own approval records in Firebase.
- **Project creation is controlled:** only the super admin, and people the super admin marks **"Can create projects"** on
  a new **Users** screen (only the super admin sees it and grants or removes the permission), see "Import from GitHub"
  and "+ New project". New repositories are created only in the GitHub account or organization the super admin
  configured. The creator becomes the Admin of the new project's team. Everyone else sees "Ask the super admin to add
  a project".
- With sign-in off, or in the demo, nothing changes.

## Done when
- A team member without any token of their own can save to GitHub, approve and release, and run live agents; GitHub
  shows the super admin's account, and each commit or pull request names the member who did it.
- Nobody but the super admin can see, set or replace the GitHub token or the Anthropic key; the Firestore rules refuse
  anyone else.
- The Team page has no project token; stored project tokens are gone.
- A member without "Can create projects" sees no Import and no New project; a permitted person creates repositories only
  in the configured account or organization and becomes Admin of the new project.

## Why
The Product Owner wants to run phase 1 on their own GitHub and Anthropic accounts and control all access to them.
Project Admins setting their own tokens, and members using personal tokens to import their own repositories, take that
control away.

## Constraints
- Free Firebase Spark plan; no server code (ADR-010). Compass runs in the browser, so the super admin's token and key
  must be readable by every team member's browser to be used for them. A technical member could copy them. Therefore:
  a fine-grained GitHub token limited to the Compass project repositories with an expiry date, and an Anthropic key
  with its own spending limit; replace both when someone leaves.
- On GitHub every change shows the super admin's account; who did it is in the commit/pull request text and in
  Compass's approval records.
- `firestore.rules` changes need the Product Owner's review and publishing in the Firebase console.
- Compass cannot stop anyone using GitHub directly; it controls only what Compass offers.

## Out of scope (phase 2)
- Each person working with their own GitHub token or account (backlog, with "Connect with GitHub", #111).
- A per-project Anthropic key or per-person spending limits.
- Project Admins granting "Can create projects".

## Requirements
- REQ-041 — The super admin's GitHub token and Anthropic key are used for everyone; only the super admin sets them
- REQ-042 — Every commit and pull request says who did it in Compass
- REQ-043 — Project tokens set by project Admins are retired
- REQ-044 — Only the super admin and people they permit create projects, only in the configured GitHub account
