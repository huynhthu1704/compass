---
name: New requirement
about: Propose a requirement (it will be added to compass/spec.json)
title: "REQ-xxx: <one-line outcome>"
labels: requirement
---
<!-- Standard requirement issue (ADR-021). Fill every section; write "none: <reason>" instead of leaving one empty. -->

## Summary
**As a** … **I want** … **so that** …

## Acceptance criteria
| # | Given | When | Then | Test case |
|---|---|---|---|---|
| AC1 | … | … | … | TC-… |
| AC2 | … | … | … | TC-… |

## Design
| | |
|---|---|
| Figma | [F-xxx · SCR-n · <screen name>](https://www.figma.com/design/<fileKey>?node-id=<node-id>) |
| Design doc | `compass/design/F-xxx.md` (status: Draft / Approved) |

<!-- One screenshot per screen this requirement delivers, exported from the Figma frame above and committed to
     compass/design/screens/F-xxx-SCR-n.png. Link it by commit SHA so the image never breaks:
     https://github.com/<owner>/<repo>/raw/<commit-sha>/compass/design/screens/F-xxx-SCR-n.png
     No UI → write "Design: none: <reason>". Not drawn yet → "Design: not drawn yet" and update this issue when it is. -->
![F-xxx SCR-n · <screen name>](https://github.com/<owner>/<repo>/raw/<commit-sha>/compass/design/screens/F-xxx-SCR-n.png)

## Requirement details
| Field | Value |
|---|---|
| Requirement | REQ-xxx |
| Feature | F-xxx · <feature name> |
| Title | <one-line outcome, same as the issue title> |
| User story | As a … I want … so that … |
| Priority | Must / Should / Could |
| Status | Draft / Approved / In build / Done |
| Roles | <who uses it: PO, BA, UX, QA, Dev, DM, Ops, Admin, super admin> |
| Intent | `compass/intent/<file>.md` |
| Screens | SCR-n, SCR-m |
| Business rules | <rules, limits, permissions> |
| Out of scope | <what this requirement does not do> |
| Dependencies | <REQ-… / #issue / ADR-…, or none> |
| Test cases | TC-… |
