# Intent: Team access — admins add people to projects with roles, people sign in with Google

Status: Draft
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

## What we want
1. **A team list per project.** On a project's new *Team* page, an admin adds a person by email address and ticks one
   or more roles: PO, BA, UX, QA, Dev, DM, Ops (the roles Compass already uses), plus **Admin**. The admin can change
   roles or remove the person later.
   Only a super admin or that project's Admin can do this. The super admin also sees every project.
   Target: a new team member is added with their roles in under 1 minute, with no file edited by hand.
2. **Sign in with Google, matched by email.** The portal shows a *Sign in with Google* screen. After sign-in, Compass
   compares the Google account's verified email (case-insensitive) with the team lists.
   Target: a registered person sees only the projects they belong to; an unregistered email sees "You have no access
   yet — ask your admin" and no project data.
3. **Roles decide what a person can do.** Each approval gate is tied to the role that owns it: PO approves intents,
   requirements and releases; UX approves designs; QA approves test cases; Dev starts builds; DM/PO confirm releases.
   Buttons a person's roles do not allow are hidden or disabled with a hint naming the role needed. Admin manages the
   team and the project's GitHub token.
   Target: 0 gates can be passed from the portal by someone without the owning role.
4. **One GitHub token per project.** The project Admin saves a GitHub token for the project once; members who sign in
   use it for that project's GitHub writes without connecting their own. Only Admins can see or replace it.
   Target: a BA with no GitHub account can approve requirements and the portal commits them to the repo.
5. **Every approval shows who gave it.** `approvedBy` records the signed-in person's email and role, so the audit
   trail in `spec.json` names a real person instead of "the Product Owner".

## Why
Today Compass has no idea who is using it: whoever opens the portal on a device with a GitHub token can approve any
gate. The AI-native SDLC relies on "a human with the right role approves", but nothing checks the role. Bringing in a
BA, QA or designer means handing them the whole portal.

## Constraints
- Compass stays a browser-only app with no server code and no Cloud Functions. Firebase **Spark (free) plan only**;
  the Product Owner creates the Firebase project once and its web config is added to the build (the config is not a
  secret; the security rules are what protect the data).
- **Firestore security rules are the real gate:** only members of a project can read it; only its Admins or a super
  admin can change its team or token; the role → gate rules are checked in the rules for every approval write.
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
<filled after approval>
