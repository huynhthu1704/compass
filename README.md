# Compass — AI dev portal

**Idea → Requirements → Test cases → Code → Release**, run by agents you can trust, on your own GitHub repos.

Live: https://huynhthu1704.github.io/compass/

## Features in parallel
A project (one repo) holds many **features** (F-001, F-002…). Each feature has its own idea, requirements, test cases, agent PRs and status, and moves through the pipeline independently. The **Feature board** shows every feature as a card in its current stage. A release can bundle several features. Each feature is documented in `compass/features/F-xxx.md`.

## What it does
- **Manages your GitHub projects.** You can create a new repo from an idea, or import any existing repo.
- **Runs a six-stage pipeline.** Each stage has its own agent and a human approval gate, and the next agent starts automatically once a gate is passed:

  | Stage | Agent | Output | Gate |
  |---|---|---|---|
  | Idea | Ideation agent | The PO's raw **business need**, revised into a measurable **business intent** + brief (`compass/intent/F-xxx.md`) | PO approves → Requirements agent starts |
  | Requirements | Requirements agent | REQ-xxx user stories with Given/When/Then AC | PO/BA approve every requirement → Design agent starts |
  | Design | Design agent | Screens traced to REQ ids, linked to the project's design tool (Figma, Penpot…) (`compass/design/F-xxx.md`) | PO/UX approve the design → **coding unlocks** |
  | Test cases | Test design agent | TC-xxx traced to requirements | QA approves |
  | Build | Coding agent + reviewer | Plan (`compass/plans/…md`) + change set → branch → pull request | Guardrails pass + human approves the diff |
  | Release | Release agent | Checks CI, merges PRs, tags vX.Y.Z, deploys to GitHub Pages | DM/PO confirm |

- **Connects one design tool per project.** Paste the Figma (or other tool) project link on the Design page; each feature and screen can link to its own frame, and Figma links are previewed inline.
- **Lets anyone continue the work.** Every repo gets the **Compass Framework**, so any role, human or AI, can pick up the project with or without the portal.

## Agent architecture
1. **Agent Harness.** Each agent has its own system prompt, tool allow-list and turn budget. Every run is fully traced (plan → retrieve → tool calls → model turns → checks), and a human approval gate sits in front of every spec change and every GitHub write.
2. **RAG.** Compass indexes the repo files and `compass/spec.json`, then retrieves the most relevant chunks with BM25 in the browser. Agents receive these chunks as `[S1..Sn]` and cite them in their answers.
3. **Tool calling.** Agents call tools through the Claude `tool_use` loop: `search_knowledge`, `list_files`, `read_file`, `save_idea`, `save_requirements`, `save_tests`, `propose_file_change` and `finish`. The model only *proposes* changes. All GitHub writes (branch, commit, PR, merge, release) are done by the harness after approval.
4. **Evaluation & Guardrails.**
   - Before a run: a prompt-injection scan of the retrieved content.
   - On every change set: secret scanning, forbidden and protected paths, change-size limits, deletions, dependency changes, and requirement traceability.
   - Quality evals: story format, testable AC, ambiguity, test coverage, negative-path tests, and whether code comes with tests. In live mode, an LLM-as-judge reviewer also scores each change set.
   - In CI: `compass/check-spec.mjs` plus your tests run on every PR.

## Compass Framework v1.1 (installed into each repo): AI-native SDLC
```
AGENTS.md / CLAUDE.md            handover contract + lessons learned for any human or AI agent
compass/spec.json                source of truth: features, REQ-xxx, designs, TC-xxx, ADR-xxx, design tool
compass/intent/                  business intent (what & why), approved before requirements; F-xxx.md generated
compass/design/F-xxx.md          the approved UI design: gate before any code
compass/plans/                   one plan per change (Files, Steps, Risks, Proof), committed before the code
compass/REVIEW.md                independent review of every PR by an agent that did not write it
compass/*.md                     generated views + handover.md (next step per role)
compass/guardrails.json          rules agents must obey
compass/check-spec.mjs           CI: traceability, approved intent, design gate, ADR log
compass/check-guardrails.mjs     CI: protected/forbidden paths, size, secrets, deps, plan before code
compass/hooks/guard-edit.mjs     Claude Code hook (.claude/settings.json) blocking protected paths and secrets
.github/workflows/compass-ci.yml     spec + guardrails checks + npm test + build on PRs
.github/workflows/compass-deploy.yml GitHub Pages deploy on main
.github/pull_request_template.md, ISSUE_TEMPLATE/
```
The scripts live in `src/framework/` and are installed verbatim.

## Connections
Everything runs in the browser, and keys stay on your device:
- **GitHub fine-grained token.** Needs these permissions:
  - Read & write on Contents, Pull requests, Workflows, Actions and Pages.
  - Read & write on Administration, only if you want Compass to create new repos.
- **Anthropic API key.** Without a key, every agent runs in **demo mode**: same harness, trace, guardrails and evals, but with template outputs.

## Develop
```bash
npm install
npm run dev
npm run build
```
Source map: `src/harness.ts` (agents & tool loop), `src/rag.ts`, `src/guardrails.ts`, `src/framework.ts`, `src/github.ts`, `src/pages/*`.

The previous version (product knowledge base) is kept on branch `archive/v2-product-knowledge`.
