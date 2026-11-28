# Intent: phase 1 — everyone works through the super admins' GitHub token and Anthropic key; only super admins create projects

Status: Approved (by the Product Owner, 2026-11-27, in chat: "Approve"; revised 2026-11-28 after the independent reviews of
#117, with the Product Owner's answers: token scope "Only super admins create"; import by people who are not super admins
"New repos only" (moot once only super admins add projects); audit line "Email"; then "Hide for members" (Connections in
the account menu), "Yes, super admins import" and "Accept for phase 1" (one work token for every project); after the third review
"Accept: Admins are trusted", "Wait for work token" and "Full list + reminder")
Requested: 2026-11-27 by the Product Owner, in chat. Revised the same day; the last word: "the intention is that everyone
will use my personal token for action and changes in the first phase. So the github and anthropic token should only be
configured by me"

## What we want
With sign-in on, in phase 1:
- **More than one super admin:** the owner (the Product Owner's account, ADR-013) can make other people super admins
  on the Users screen, and remove them again; only the owner can do this, and the owner always stays. Super admins can
  do everything else the owner can.
- **One shared GitHub work token and one shared Anthropic key, set only by super admins**, on Connections. Compass uses
  them for every person's GitHub work and live agent runs on team projects. The work token is a fine-grained token
  limited to the Compass project repositories (Contents, Pull requests, Issues, Workflows and Pages: Read and write;
  Actions: Read; never Administration), so it cannot create or delete
  repositories. The Connections page is hidden from everyone but super admins; members use the model and sync settings
  the super admins chose. A token or key that someone saved on their own device is never used for a team project.
- **Project Admins no longer set a project token.** The per-project token card on the Team page is removed and stored
  project tokens are deleted (the shared work token replaces them).
- **An audit line on GitHub:** every commit and pull request Compass makes ends with "Made in Compass by <email>
  (<role>)". It helps people read GitHub's history; Compass's approval records in Firebase stay the record that the
  Firestore rules check.
- **Only super admins add projects:** only super admins see "Import from GitHub" and "+ New project". A super admin
  creates a new repository with a **creator token** saved only on their own device (it needs all repositories and the
  Administration permission, so it is never shared), and only in the GitHub account for new projects set on
  Connections. A super admin can also import an existing repository of that account. After creating or importing, Compass
  asks them to add the repository to the shared work token on GitHub; the setup (framework, workflow, Pages,
  first agent run) waits until the work token reaches it. Everyone else
  sees "Ask a super admin to add a project". Only super admins create a project's first team (ADR-012 unchanged).
- With sign-in off, or in the demo, nothing changes.

## Done when
- A team member without any token of their own can save to GitHub, approve and release, and run live agents; GitHub
  shows the work token owner's account, and each commit or pull request ends with the member's audit line.
- Only super admins can set or replace the work token, the GitHub account for new projects and the Anthropic key: the
  Firestore rules refuse writes from anyone else. Team members' browsers can read the work token and key (they must, to
  use them); nobody else can.
- The Team page has no project token; stored project tokens are deleted.
- Only super admins see Import and New project; a new repository is created, and an existing one imported, only in the
  GitHub account for new projects.
- Only the owner can add or remove super admins: the Firestore rules refuse anyone else.

## Why
The Product Owner wants to run phase 1 on their own GitHub and Anthropic accounts and control all access to them.
Project Admins setting their own tokens, and members using personal tokens to import their own repositories, take that
control away.

## Constraints
- Free Firebase Spark plan; no server code (ADR-010). Compass runs in the browser, so the work token and the Anthropic key
  must be readable by every team member's browser to be used for them. A technical member could copy them and use them
  outside Compass. Therefore: the work token is fine-grained, limited to the Compass project repositories, without the
  Administration permission, with an expiry date; the Anthropic key has its own spending limit; both are replaced when
  someone leaves.
- One work token reaches every Compass project repository, and members of any team can read it: a member of one project
  could change another project's repository on GitHub outside Compass. Accepted for phase 1 (ADR-016); one work token
  per project is in phase 2 (#111).
- With sign-in on, Connections is also left out of members' account menu (REQ-110 amended, ADR-020).
- Who can read the work token and key follows team membership, and project Admins add people to teams (REQ-030): adding
  someone gives their browser the token and key. Accepted: Admins are trusted (ADR-016).
- Compass cannot check from outside that the work token has no Administration permission; Connections lists the needed
  permissions and says never to tick Administration (ADR-016).
- What the Firestore rules guard: writes to the token, key, account and super admin list in Firestore. They never see
  GitHub: a person holding the work token can commit on GitHub without Compass, so the audit line is a convenience, not
  proof. Proof of an approval stays Compass's approval record (REQ-037, ADR-012).
- The audit line writes members' emails into GitHub history permanently; in a public repository anyone can read them
  (the Product Owner chose the email, 2026-11-28).
- `firestore.rules` changes need the Product Owner's review and publishing in the Firebase console.
- Compass cannot stop anyone using GitHub directly; it controls only what Compass offers.

## Out of scope (phase 2)
- Each person working with their own GitHub token or account (backlog, with "Connect with GitHub", #111).
- Letting people who are not super admins create or import projects.
- A per-project Anthropic key or per-person spending limits.

## Requirements
- REQ-041 — The super admins' GitHub work token and Anthropic key are used for everyone; only super admins set them (#112)
- REQ-042 — Every commit and pull request says who did it in Compass (#113)
- REQ-043 — Project tokens set by project Admins are retired (#114)
- REQ-044 — Only super admins create or import projects, only in the GitHub account for new projects (#115)
- REQ-046 — The owner can make other people super admins (#116)
