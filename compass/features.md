# Features

Each feature is one business intent moving through Idea → Requirements → Test cases → Build → Release.

| Feature | Stage | Design | Requirements | Tests |
|---|---|---|---|---|
| [F-001 Idea: business need → business intent](features/F-001.md) | Design | [—](design/F-001.md) | 3 | 5 |
| [F-002 Requirements: generate and approve](features/F-002.md) | Released | [—](design/F-002.md) | 1 | 1 |
| [F-003 Design: design tool and approval gate](features/F-003.md) | Design | [—](design/F-003.md) | 5 | 9 |
| [F-004 Test cases: one or more per requirement](features/F-004.md) | Released | [—](design/F-004.md) | 1 | 1 |
| [F-005 Build: coding agent, plan and pull request](features/F-005.md) | Released | [—](design/F-005.md) | 1 | 1 |
| [F-006 Release: merge, tag and deploy](features/F-006.md) | Released | [—](design/F-006.md) | 1 | 1 |
| [F-007 Compass Framework: install into repos safely](features/F-007.md) | Released | [—](design/F-007.md) | 1 | 1 |
| [F-008 Compass follows its own delivery process](features/F-008.md) | Release | [—](design/F-008.md) | 4 | 4 |
| [F-009 Team floor: watch the agent team work, live](features/F-009.md) | Release | [Approved](design/F-009.md) | 9 | 24 |
| [F-010 Honey brand: Compass shares the Bee There look](features/F-010.md) | Release | [Approved](design/F-010.md) | 3 | 9 |
| [F-011 Readability follow-ups: status labels and phone stage strip](features/F-011.md) | Build | [Approved](design/F-011.md) | 3 | 6 |
| [F-012 Delete a feature and close its GitHub issues](features/F-012.md) | Build | [Approved](design/F-012.md) | 4 | 10 |
| [F-013 Sidebar navigation: grouped, scannable and keyboard friendly](features/F-013.md) | Build | [Approved](design/F-013.md) | 5 | 7 |
| [F-020 Quote an agent answer and ask for details or a revision](features/F-020.md) | Build | [Approved](design/F-020.md) | 5 | 18 |
| [F-017 Collapsible agent trace](features/F-017.md) | Build | [Approved](design/F-017.md) | 1 | 2 |

**Tech stack:** React 19 + TypeScript + Vite single-page app (runs in the browser, no server); GitHub REST API and the Claude API; node:test for the checking scripts; GitHub Pages deploy
