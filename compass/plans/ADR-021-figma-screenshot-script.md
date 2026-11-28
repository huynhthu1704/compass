# Plan: ADR-021 download Figma screenshots through one checked script

Feature: none (framework tooling for ADR-021) · Requirements: none · Test cases: TC-004 (no drift), figmaScreenshot tests
Intent: Product Owner in chat on 2026-11-28 ("rework #132 with the script") · Design: none: tooling, no UI

## Files
- `compass/figma-screenshot.mjs` (+ framework copy `src/framework/figma-screenshot.mjs`) — downloads one Figma MCP screenshot to `compass/design/screens/<F-xxx-SCR-n>.png`
- `.claude/settings.json` (+ `src/framework/claude-settings.json`) — allow `Bash(node compass/figma-screenshot.mjs *)` only
- `compass/guardrails.json` and `src/framework.ts` (`DEFAULT_GUARDRAILS`, installed files) — the script is a protected path and is installed with the framework
- `tests/figmaScreenshot.test.mjs` — argument checks, PNG check, rule and protection; `tests/noDrift.test.mjs` — script copies stay identical

## Steps
1. Replace the free-form `curl` allow rules (review of #132: they matched uploads, other hosts and any output path) with one rule for the script.
2. The script takes exactly two arguments: the asset URL must be `https://www.figma.com/api/mcp/asset/<uuid>.png`, the name must be `F-xxx-SCR-n`; it runs `curl` without a shell, with fixed options (`--proto =https`, `--max-filesize`, `--max-time`, `--` before the URL), into a temp file, and keeps it only if it starts with the PNG signature.
3. Protect the script (guardrails + hook + CI label), so an agent cannot edit it to widen what the rule allows.
4. Install it, the rule and the protection with the framework, as TC-004 requires the repo and framework copies to match.

## Risks
- The `*` in the rule still accepts any arguments; the script rejects all but the two checked ones, so the rule permits nothing the script does not. Shell operators (`;`, `&&`, `|`) are split by Claude Code and each part is checked on its own. An output redirection (`> file`) on the allowed command is a residual risk: the script writes only a one-line status, but whether Claude Code prompts for it depends on Claude Code's own redirection handling, not on this rule.
- The rule only stops prompts; it does not restrict network hosts. Hosts are limited by the cloud environment's network allowlist where one is set, not on a local machine.
- If the script were editable it would widen the rule: it is a protected path, so edits need the `human-approved` label.

## Proof
- `npm test` (figmaScreenshot tests, TC-004), `node compass/check-spec.mjs`, `node compass/check-guardrails.mjs origin/main` (fails only for the protected-path label), `npm run build`, each run on its own.
- A real run: `node compass/figma-screenshot.mjs <asset-url> F-015-SCR-8` saves a PNG; a non-Figma URL and a bad name are rejected.
