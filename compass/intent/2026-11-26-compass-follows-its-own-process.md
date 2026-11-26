# Intent: Compass follows its own delivery process

Status: Approved (by the Product Owner, 2026-11-26, in chat)
Requested: 2026-11-26 by the Product Owner, in chat

## Business need
"make the compass repo itself follow the ai-native sdlc"

## What we want
From the next pull request on, every change to the Compass portal follows the same steps Compass asks of other projects:
1. a business intent you approve
2. requirements you approve
3. a design you approve (for anything users see)
4. a written plan, committed before the code
5. automatic checks and an independent review before merge

Today Compass's own pull requests get no checks at all. Target: 100% of its pull requests are checked, from the first
one after this setup is merged.

## Why
Compass enforces this process in other projects (for example travel-map) but not in its own code. Its pull requests
have no automatic checks, no tests, no plan and no review record, and the checking scripts it installs elsewhere are
never tested in Compass itself.

## Constraints
- Keep the current website deploy as it is; only add checks
- No paid services and no new libraries (tests use Node's built-in runner)
- At most 12 files per pull request once the checks are on
- The checking scripts in compass/ must stay identical to the copies the portal installs (src/framework/); a test makes sure

## Success measure
A pull request that has no plan, skips an approval, or breaks a guardrail is stopped by the checks, and every pull
request has an independent review before it is merged.

## Scope
The portal as it is today is recorded as a short baseline: one feature per stage (Idea, Requirements, Design, Test
cases, Build, Release, Framework), marked Released. Requirements are written only for new work.

## Out of scope
Writing requirements for every existing portal behaviour; changing how the website is deployed.

## Requirements
- REQ-001 — The Compass repo has the Compass Framework (#2)
- REQ-002 — Every pull request is checked by CI (#3)
- REQ-003 — The checking scripts have unit tests (#4)
- REQ-004 — The installed scripts never drift from the portal's copies (#5)
