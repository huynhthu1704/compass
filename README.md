# Compass

**From business intent to measurable outcome.** A guided workspace for Business Analysts, Product Owners and Delivery Managers that goes from business need → analysis → design → user stories → rollout → usage monitoring.

## What it does

1. **Ask the business intent.** It asks "What outcome does the business want?" and nudges you if you describe a solution instead of an outcome. Then it asks up to five clarifying questions, and you can skip any of them.
2. **Suggest next actions.** A rule-based engine (BABOK v3 plus real-world BA practice) suggests next actions. It looks at your phase, the artefacts you already have, gaps, your role and the size of the change. **Exactly one** action is marked *Recommended*. Examples of the rules:
   - stakeholders before elicitation;
   - success metrics before the backlog;
   - a tracking plan before release;
   - no BRD or full business case for small changes;
   - monitoring actions move to the top when usage drops.
3. **Generate the result.** You pick an action and Compass produces an editable artefact, with versioning and approval. Outputs include:
   - problem statement, stakeholder map with RACI, SWOT, root cause, as-is and to-be processes (Mermaid);
   - KPI tree, scope with MoSCoW, BR/FR/NFR requirements, glossary, BRD;
   - solution options, a **Figma design brief and screen spec** (plus a JSON layout spec), data model, analytics tracking plan;
   - **detailed user stories** (Gherkin acceptance criteria, tracking events, INVEST check);
   - prioritisation and story map, release plan, RAID log, test scenarios;
   - rollout plan, UAT, comms and training;
   - KPI review, feedback plan, and a scale / iterate / roll back recommendation.
4. **Release & monitor.** Release and monitoring tools:
   - a go/no-go checklist and a staged rollout;
   - a change log that is drawn on the usage charts;
   - an adoption funnel (exposed → tried → activated → retained);
   - week-on-week alerts;
   - a traceability matrix from the need to stories, releases and metrics.

### Roles
Business Analyst, Product Owner, Delivery Manager, Sponsor, UX, Developer, QA, Ops/Change, Data. Your role changes which actions come first.

### Optional AI
It works fully offline, using templates filled with your project context. If you add your own Anthropic API key in **Settings**, "✦ Generate with Claude" writes artefacts and user stories specific to your project. The key is stored only in your browser.

### Exports
Markdown for each artefact or the whole project, CSV of stories (import into Jira or Azure DevOps), a Figma layout spec as JSON, and a JSON backup and restore.

## Design system
Compass Design System v0.1 in Figma: https://www.figma.com/design/5e1GvRGmOSfiPS8HeoTkrr
The tokens in `src/index.css` mirror the Figma variables:
- colours, including the six phase colours, with light and dark modes;
- spacing on a 4-pt grid, radius and elevation.

Fonts: Be Vietnam Pro (UI) and JetBrains Mono (story IDs and metrics).

## Run locally
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Deploy
Every push to `main` is deployed to **GitHub Pages** by `.github/workflows/deploy.yml`. One-time setup: in the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

## Tech
React 19, TypeScript and Vite. No backend: data lives in `localStorage`. Hash routing, so it works on GitHub Pages.

```
src/
  catalog.ts      # 28 actions: phase, BABOK ref, owner, prerequisites
  engine.ts       # next-action rules, phase detection, usage alerts
  generators.ts   # artefact templates, user-story generator, exports
  ai.ts           # optional Claude API generation
  pages/          # Projects, New project wizard, Overview, Actions, Artefacts, Backlog, Release, Monitor, Traceability, Knowledge, Settings
```
