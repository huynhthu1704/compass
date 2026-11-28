# Plan: REQ-032 The sign-in screen no longer says you need an account first

Feature: F-015 · Requirements: REQ-032 · Screen: SCR-1 · Decision: ADR-024
Design: compass/spec.json → F-015 design SCR-1 (element list updated, approved by the Product Owner in chat)

## Why
Anyone with a Google account can sign in. Someone on no team lands on "You have no access yet" (SCR-2), which already says
"Ask your admin to add this email to a project" and offers "Try the demo". The SCR-1 hint "No account yet? Ask your
project Admin…" and the line "Use the Google account your admin added to your project" made signing in sound blocked,
and the demo now needs sign-in (ADR-022).

## Files
- src/pages/SignIn.tsx — new line under the title; the "No account yet?" box removed
- compass/spec.json — SCR-1 elements; ADR-024
- compass/design/F-015.md — the SCR-1 element line (generated view, kept in step)

## Steps
1. Commit this plan.
2. Change the copy and the SCR-1 elements, add ADR-024.
3. Run `npm test`, `npm run build`, `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main`; screenshot SCR-1 in a local build.

## Risks
- Copy only: no logic changes, so no unit test changes. SCR-2 keeps the "ask your admin" advice.
- The Figma frame for SCR-1 (node 102-609) still shows the old hint until it is redrawn.

## Proof
- Screenshot of the sign-in card in a local build with a placeholder Firebase config.
