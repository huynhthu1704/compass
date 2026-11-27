# Intent: Team access — admins add people to projects with roles, people sign in with Google

Status: Approved (by the Product Owner, 2026-11-27, in chat)
Requested: 2026-11-27 by the Product Owner, in chat

## Business need
"Create a management module that allows admins to onboard users into projects and assign them specific roles. Each
user can have multiple roles when needed. Users must log in with a Google account using the same email address
registered in the system. This allows the system to identify which projects and roles they are authorized to access."

Answers given in chat (2026-11-27):
- The team list and sign-in use **Firebase on the free Spark plan** (Firebase Auth with Google + Firestore), so access
  is enforced by Firestore security rules, not only hidden in the browser.
- Team members use a **shared project GitHub token** that the project admin stores once; members do not need their own.
- **Two admin levels:** the Product Owner is the portal-wide **super admin**; a super admin can make someone **Admin**
  of a single project.

Decision after the independent review of PR #74 (2026-11-27): approvals are saved to GitHub with the shared token, so
Firestore rules alone cannot stop a member from committing an approval their role does not own. The Product Owner chose
to **record every approval in Firebase**, where the rules check the role, and to have the portal **flag any approval in
the repo that Firebase does not confirm** (ADR-012).

The Product Owner asked not to set the super admin by hand in Firestore: the portal records her account at its first
sign-in, and the rules allow that only for her email, stored as a one-way hash (ADR-013).

## What we want
1. **A team list per project.** On a project's new *Team* page, an admin adds a person by email address and ticks one
   or more roles: PO, BA, UX, QA, Dev, DM, Ops (the roles Compass already uses), plus **Admin**. The admin can change
   roles or remove the person later.
   Only the super admin creates a project's first team; after that the super admin or that project's Admin manage it. The super admin also sees every project.
   Target: a new team member is added with their roles in under 1 minute, with no file edited by hand.
2. **Sign in with Google, matched by email.** The portal shows a *Sign in with Google* screen. After sign-in, Compass
   compares the Google account's verified email (case-insensitive) with the team lists.
   Target: a registered person sees only the projects they belong to; an unregistered email sees "You have no access
   yet — ask your admin" and no project data.
3. **Roles decide what a person can do.** Each approval gate is tied to the role that owns it: PO approves intents;
   PO or BA approve requirements; UX or PO approve designs; QA approves test cases; Dev starts builds; DM or PO
   confirm releases.
   Buttons a person's roles do not allow are hidden or disabled with a hint naming the role needed. Admin manages the
   team and the project's GitHub token.
   Target: 0 gates can be passed from the portal by someone without the owning role; an approval committed outside the
   portal (with the shared token) is flagged as unconfirmed.
4. **One GitHub token per project.** The project Admin saves a GitHub token for the project once; members who sign in
   use it for that project's GitHub writes without connecting their own. Only Admins can replace it; the portal does
   not display it to others, but every member's browser can read it (ADR-011).
   Target: a BA with no GitHub account can approve requirements and the portal commits them to the repo.
5. **Every approval shows who gave it.** `approvedBy` records the signed-in person's email and role, so the audit
   trail in `spec.json` names a real person instead of "the Product Owner".
6. **Approvals are confirmed by Firebase.** Each approval is first written to Firestore, where the rules accept it only
   from a person with the owning role; only then is it committed to GitHub. A record must carry the signed-in person's own
   verified email and a role they hold. When the team is created, the approvals already in `spec.json` are stored in
   Firebase as a baseline; any approval in neither the baseline nor a record is shown with an "Unconfirmed" badge,
   whatever date it claims. Only the super admin creates a project's first team, and the baseline with it. Residual risk: an approval
   forged into `spec.json` before the team is first created ends up in the baseline and is never flagged.
   Target: every approval made after team access is switched on is either confirmed by Firebase or visibly flagged.

7. **Roles come from the team; the role picker lives on in a demo.** With sign-in on, the "What's your role?" screen
   is not shown. A signed-in person on no team can "Try the demo" instead of a dead end: they pick a role and explore
   the sample projects, kept in their browser only (ADR-014).

## Why
Today Compass has no idea who is using it: whoever opens the portal on a device with a GitHub token can approve any
gate. The AI-native SDLC relies on "a human with the right role approves", but nothing checks the role. Bringing in a
BA, QA or designer means handing them the whole portal.

## Constraints
- Compass stays a browser-only app with no server code and no Cloud Functions. Firebase **Spark (free) plan only**;
  the Product Owner creates the Firebase project once and its web config is added to the build (the config is not a
  secret; the security rules are what protect the data).
- **Firestore security rules are the gate for Firebase data:** only members of a project can read it; only its Admins
  or a super admin can change its team or token; approval records are accepted only from the role that owns the gate
  and can never be changed or deleted. GitHub writes are not seen by Firestore: they use the shared token, so the
  portal checks roles before committing and flags approvals that have no Firebase record (ADR-012).
- New dependency: the `firebase` library (approved in chat with this choice; the PR still gets the `human-approved`
  label for the dependency change). The rules file and any CI change need the Product Owner's approval.
- **Shared token risk (accepted by choosing it):** the browser of every member must hold the token to call GitHub, so
  any member could copy it. To limit the damage the Connect/Team page asks for a **fine-grained token for that one repo
  only**, with only Contents, Pull requests and Issues permissions and an expiry date; removing a member does not
  revoke what they may have copied, so the page advises replacing the token after removing someone.
- No paid service.
- Demo mode keeps working without sign-in.
- Honey design system; Team page and sign-in screen work on a phone and with the keyboard; UI text in English.
- The first admin is the Product Owner's own Google account, set once; at least one admin must always remain.

## Success measure
In a test project: the admin adds `ba@example.com` as BA + QA. That person signs in with Google, sees only this
project, can approve requirements and test cases, and sees the design and release approvals disabled. A Google account
that is not on any team sees no project. Unit tests cover email matching, multiple roles and the role → gate rules.

## Out of scope
- Email invitations (the admin tells the person; the person just signs in with that Google account).
- Sign-in with providers other than Google, or with password.
- Giving each team member their own GitHub access (the shared project token covers it).
- Moving existing projects' data (ideas, runs) from the browser to Firebase; only the team and the token go there.
- Per-requirement or per-feature permissions.

## Requirements
Feature F-015 · Team access: Google sign-in, project teams and roles (decisions ADR-010, ADR-011, ADR-012, ADR-013, ADR-014)
- REQ-030 — An admin adds a person to a project by email with one or more roles (#39)
- REQ-031 — An admin changes a person's roles or removes them from the project (#40)
- REQ-032 — People sign in with Google and see only the projects whose team lists their email (#41)
- REQ-033 — Each approval gate can be passed only by a person with the role that owns it (#42)
- REQ-034 — A project Admin stores one GitHub token that the project's members use (#43)
- REQ-035 — The super admin sees every project and can make someone a project Admin (#44)
- REQ-036 — Every approval records the email and role of the person who gave it (#45)
- REQ-037 — Each approval is recorded in Firebase, whose rules accept it only from the owning role (#82)
- REQ-038 — Approvals in the repo that Firebase does not confirm are flagged (#83)
- REQ-039 — With sign-in on, roles come from the team instead of the role picker (#88)
- REQ-040 — A signed-in person can try the demo with a role of their choice (#89)
