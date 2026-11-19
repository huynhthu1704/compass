# Compass — AI dev portal

**Idea → Requirements → Test cases → Code → Release**, run by agents you can trust, on your own GitHub repos.

Live: https://huynhthu1704.github.io/compass/

## What it does
- **Manages your GitHub projects.** You can create a new repo from an idea, or import any existing repo.
- **Runs a five-stage pipeline.** Each stage has its own agent and a human approval gate:

  | Stage | Agent | Output | Gate |
  |---|---|---|---|
  | Idea | Ideation agent | Outcome-focused brief | PO approves |
  | Requirements | Requirements agent | REQ-xxx user stories with Given/When/Then AC | PO/BA approve |
  | Test cases | Test design agent | TC-xxx traced to requirements | QA approves |
  | Build | Coding agent + reviewer | Change set → branch → pull request | Guardrails pass + human approves the diff |
  | Release | Release agent | Checks CI, merges PRs, tags vX.Y.Z, deploys to GitHub Pages | DM/PO confirm |

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

## Compass Framework (installed into each repo)
```
AGENTS.md / CLAUDE.md            handover contract for any human or AI agent
compass/spec.json                source of truth: idea, REQ-xxx, TC-xxx, ADR-xxx
compass/*.md                     generated views + handover.md (next step per role)
compass/guardrails.json          rules agents must obey
compass/check-spec.mjs           CI traceability check
.github/workflows/compass-ci.yml     spec check + npm test + build on PRs
.github/workflows/compass-deploy.yml GitHub Pages deploy on main
.github/pull_request_template.md, ISSUE_TEMPLATE/
```

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
