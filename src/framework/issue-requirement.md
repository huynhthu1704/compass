---
name: New requirement
about: Propose a requirement (it will be added to compass/spec.json)
title: "REQ-xxx: <one-line outcome>"  # a proposal without an id yet: "REQ-new: …"
labels: requirement
---
<!-- Standard requirement issue. Fill every section; write "none: <reason>" instead of leaving one empty.
     No REQ id yet? Title it "REQ-new: …" and write "new" in the tables; once the requirement is in compass/spec.json,
     rename the issue to its id (a new id must be free on main and on every open branch).
     Table cells hold one line: join a multi-line Given/When/Then (And …) with <br>, and write a literal | as \|. -->

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
| Design frame | [F-xxx · SCR-n · <screen name>](<frame link in the design tool, e.g. https://www.figma.com/design/<fileKey>?node-id=<node-id>>) |
| Design doc | `compass/design/F-xxx.md` (status: Draft / Approved) |

<!-- One screenshot per screen this requirement delivers, exported from the design frame above.
     How: compass/design/README.md → Screenshots. In short: commit compass/design/screens/F-xxx-SCR-n.png in a pull
     request and link it by that commit's SHA (the head of the open PR, or the commit on main once merged; never a
     branch without a PR, which can disappear):
     https://github.com/<owner>/<repo>/raw/<commit-sha>/compass/design/screens/F-xxx-SCR-n.png
     Add one line per screen below this comment:
     ![F-xxx SCR-n · <screen name>](https://github.com/<owner>/<repo>/raw/<commit-sha>/compass/design/screens/F-xxx-SCR-n.png)
     No UI → write "Design: none: <reason>". Not drawn yet → "Design: not drawn yet" and update this issue when it is. -->

## Requirement details
| Field | Value |
|---|---|
| Requirement | REQ-xxx |
| Feature | F-xxx · <feature name> |
| Title | <one-line outcome, same as the issue title> |
| User story | As a … I want … so that … |
| Priority | Must / Should / Could |
| Status | Draft / Approved / In build / Done |
| Roles | <the product's user roles this requirement is for> |
| Intent | `compass/intent/<file>.md` |
| Screens | SCR-n, SCR-m |
| Business rules | <rules, limits, permissions> |
| Out of scope | <what this requirement does not do> |
| Dependencies | <REQ-… / #issue / ADR-…, or none> |
| Test cases | TC-… |
