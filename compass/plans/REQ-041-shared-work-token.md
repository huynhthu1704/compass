# Plan — F-015 phase 1, build 2a of 3: the shared work token, Anthropic key and settings

Requirement: REQ-041 (AC1, AC2, AC4, AC5, AC6, AC7; AC3 shipped in build 1, #130). Amended REQ-110 AC2 (ADR-020).
Intent: compass/intent/2026-11-27-project-creation-control.md · Design: compass/design/F-015.md (SCR-10, SCR-11) ·
Decisions: ADR-016, ADR-017, ADR-020.

## Why
Build 1 (#130) added `config/workspace` and its rules. This build makes Compass use it. With sign-in on, every
person's GitHub work on team projects uses the shared work token, and live agents use the shared Anthropic key, model
and auto-sync setting. Super admins set these on Connections. Connections is hidden from everyone else.

The original build 2 also had the audit line (REQ-042). Together they need more than 12 files, so the audit line moves
to build 2b.

## Files (12)
- `src/team.ts` (pure, tested):
  - `pickToken(own, workToken, signedIn)` — with sign-in on, the work token or nothing; with sign-in off, the device
    token.
  - `missingTokenMessage` — "No GitHub token yet — ask a super admin".
  - `workspaceSettings(ws, ctx)` — the Anthropic key, model and auto-sync that override the device's settings while
    signed in, outside the demo.
  - `canOpenConnections(ctx)` — super admins, or with sign-in off, or in the demo.
- `src/store.ts`: a settings **override** layer that is never saved to the device. `store.get()` and `useStore()`
  return the settings with the override applied, so the agents, model badges and auto-sync use the shared values
  without changes. `store.raw()` returns the device's own settings.
- `src/firebase.ts`:
  - loads `config/workspace` after sign-in (super admins and people on a team) and keeps it in memory;
  - applies the override on every session change (cleared when signed out and in the demo);
  - `getWorkspace` and `useWorkspace`, plus `refreshWorkspace` after a super admin saves;
  - notifies the token listeners, so auto-sync and open pages pick up the new token.
- `src/token.ts`: `tokenFor` uses the work token when signed in; `missingToken` says "Loading the shared settings…"
  while it loads, otherwise "No GitHub token yet — ask a super admin".
- `src/pages/Projects.tsx`: opening a shared project uses the work token.
- `src/App.tsx`: the Connections address shows Projects to anyone who may not open it. The retired project token is no
  longer loaded when a project opens; the page re-renders when the shared settings arrive.
- `src/pages/NewProject.tsx` (review of #135): signed in, after a super admin creates a repository with their creator
  token, Compass stops and says what to do next — add the repository to the work token on GitHub, install the framework
  from Overview, switch Pages on. Build 3 adds "Continue setup" and switches Pages on with the creator token.
- `src/components/Sidebar.tsx`: the account menu leaves out Connections for them (REQ-110 AC2 as amended).
- `src/pages/Connect.tsx`, for super admins while signed in:
  - **Work token** (shared): its permissions are listed, with "never Administration — Compass cannot check this";
  - **GitHub account for new projects**;
  - **Creator token** (this device only);
  - the shared **Anthropic key** and **model**, and **auto-sync**.

  "Save & test" checks both tokens with GitHub, then saves the shared values to `config/workspace` and the creator
  token to the device. With sign-in off or in the demo, the page is as before.
- `tests/team.test.mjs`: TC-078 and TC-080 (pure parts); the old `pickToken` and `missingTokenMessage` cases are updated.
- `compass/spec.json`: TC-078 Pass; TC-080 stays Not run until it is checked in the browser with the emulators.
- This plan.

## Steps
plan → pure helpers + tests → store override → firebase workspace → token, Projects, App, Sidebar → Connections →
checks → emulator run in the browser (super admin saves; a member has no Connections and uses the work token and key)
→ review → the Product Owner's yes → merge.

## Risks
- **After the merge, members need the work token:** project tokens are no longer used once this is live. Until a super
  admin saves a work token on Connections, members' GitHub actions say "No GitHub token yet — ask a super admin". The
  Product Owner saves it right after the deploy (steps given then).
- **The override is never saved:** a member's own key stays on their device, but is not used while they are signed in.
  Signing out, or entering the demo, removes the override.
- **Super admins' creator token** is the device token they had before (`settings.githubToken`). Import and New project
  keep using it to read and create repositories. Build 3 limits them to the account for new projects.
- **Until build 3:**
  - **Release → "Enable GitHub Pages"** uses the work token, which has no Administration permission, so it fails;
    switch Pages on in the repository settings instead.
  - **The Team page still shows the project-token card,** whose token is no longer used.
  - **Members still see Import and New project,** which use their own device token.
- **Agents read the key from the store's settings.** The override covers every current caller, and `llm.ts` is
  unchanged.

## Proof
- `npm test`, `npx tsc --noEmit -p .`, `npm run build`, `oxlint`, `node compass/check-spec.mjs`,
  `node compass/check-guardrails.mjs origin/main`, `npm run test:rules` (unchanged rules).
- Browser run against the emulators:
  - a super admin saves the work token and key on Connections;
  - a member sees no Connections in the menu, is sent to Projects when opening its address, and their GitHub calls
    carry the work token (checked on the stubbed api.github.com);
  - their agent badge shows the shared model.
