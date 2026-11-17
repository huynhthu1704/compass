import type { Phase, Project, Role } from './types';

export interface ActionDef {
  id: string;
  phase: Phase;
  title: string;
  why: string;            // why it matters (default rationale)
  babok: string;          // BABOK reference
  effort: string;
  owners: Role[];
  output: string;         // what it produces
  heavy?: boolean;        // too heavy for small changes
  requires?: string[];    // action ids that should be done first
  kind?: 'artefact' | 'stories' | 'navigate';
  target?: string;        // for navigate
  when: string;           // when to use (knowledge library)
}

export const ACTIONS: ActionDef[] = [
  // ---------------- DISCOVER ----------------
  { id: 'problem-statement', phase: 'discover', title: 'Write the problem statement', why: 'Everything else traces back to a clear, agreed problem. Without it teams solve symptoms.', babok: 'BABOK 6.1 Analyze Current State · Business Need', effort: '~20 min', owners: ['BA', 'PO', 'Sponsor'], output: 'Problem statement + impact + 5 Whys', when: 'Always first. Use when the request is a solution ("we need an app") or when stakeholders describe different problems.' },
  { id: 'stakeholder-map', phase: 'discover', title: 'Run stakeholder analysis', why: 'Know who is affected, who decides and who can block before you elicit anything.', babok: 'BABOK 3.2 Plan Stakeholder Engagement · 10.43 Stakeholder List, Map, Personas', effort: '~30 min', owners: ['BA', 'PO', 'DM'], output: 'Stakeholder register, power–interest grid, RACI', when: 'Before interviews or workshops; whenever a new department or vendor joins.' },
  { id: 'swot', phase: 'discover', title: 'SWOT & opportunity sizing', why: 'Frames pain points as opportunities and threats so the business can judge value and urgency.', babok: 'BABOK 6.1 / 10.46 SWOT Analysis', effort: '~30 min', owners: ['BA', 'PO', 'Sponsor'], output: 'SWOT matrix + opportunity sizing', requires: ['problem-statement'], when: 'When the business needs to decide whether the opportunity is worth pursuing, or to compare with competitors.' },
  { id: 'root-cause', phase: 'discover', title: 'Root-cause analysis (Fishbone + 5 Whys)', why: 'Avoids building features that treat symptoms. Confirms the real cause with evidence.', babok: 'BABOK 10.40 Root Cause Analysis', effort: '~40 min', owners: ['BA'], output: 'Fishbone categories, 5 Whys chain, evidence to collect', requires: ['problem-statement'], when: 'When a metric is dropping or complaints keep repeating and nobody agrees why.' },
  { id: 'as-is-process', phase: 'discover', title: 'Map the current-state process', why: 'Shows exactly where in today\'s workflow the pain points happen.', babok: 'BABOK 6.1 Analyze Current State · 10.35 Process Modelling', effort: '~45 min', owners: ['BA'], output: 'As-is process (BPMN-lite / Mermaid) + pain-point annotations', requires: ['problem-statement'], when: 'When the change touches an existing operational workflow with several actors or hand-offs.' },
  { id: 'success-metrics', phase: 'discover', title: 'Define success metrics (OKR / KPI tree)', why: 'You cannot prove value later without a baseline and a target agreed now.', babok: 'BABOK 6.2 Define Future State · 10.28 Metrics and KPIs', effort: '~30 min', owners: ['PO', 'BA', 'Data'], output: 'Objective, key results, KPI tree with baseline & target', requires: ['problem-statement'], when: 'Before backlog creation. Mandatory before release.' },
  { id: 'business-case', phase: 'discover', title: 'Draft the business case', why: 'Gives the sponsor a cost/benefit/risk view to approve funding.', babok: 'BABOK 6.4 Define Change Strategy · 10.7 Business Cases', effort: '~2 h', owners: ['BA', 'PO', 'Sponsor'], output: 'Business case: options, costs, benefits, risks, recommendation', heavy: true, requires: ['success-metrics'], when: 'Medium/large investments that need formal approval. Skip for small changes.' },

  // ---------------- DEFINE ----------------
  { id: 'elicitation-plan', phase: 'define', title: 'Plan elicitation (interviews & workshop)', why: 'Prepared questions per stakeholder group get better answers in less time.', babok: 'BABOK 4.1 Prepare for Elicitation · 10.25 Interviews · 10.50 Workshops', effort: '~40 min', owners: ['BA'], output: 'Elicitation plan + question bank per stakeholder group', requires: ['stakeholder-map'], when: 'After stakeholders are known and before any requirement is written.' },
  { id: 'scope', phase: 'define', title: 'Agree scope (in / out, MoSCoW)', why: 'Prevents scope creep and sets expectations before estimates.', babok: 'BABOK 6.4 Define Change Strategy · 10.41 Scope Modelling · 10.33 Prioritization', effort: '~30 min', owners: ['PO', 'BA'], output: 'In/out of scope, MoSCoW capabilities, assumptions & constraints', requires: ['success-metrics'], when: 'Before requirements; whenever new requests appear mid-project.' },
  { id: 'requirements', phase: 'define', title: 'Specify requirements (BR / FR / NFR)', why: 'Turns agreed scope into testable, traceable requirements.', babok: 'BABOK 7.1 Specify and Model Requirements · 7.2 Verify Requirements', effort: '~1 h', owners: ['BA'], output: 'Requirement list with IDs, priority, source and acceptance notes', requires: ['scope'], when: 'After scope is agreed; refine continuously.' },
  { id: 'glossary', phase: 'define', title: 'Build the project glossary', why: 'Shared vocabulary stops business and tech from talking past each other.', babok: 'BABOK 10.20 Glossary', effort: '~20 min', owners: ['BA'], output: 'Glossary of business terms & definitions', requires: ['problem-statement'], when: 'New domain, many acronyms, or multi-vendor teams.' },
  { id: 'brd', phase: 'define', title: 'Compile the BRD', why: 'Formal sign-off document for regulated or contract-based projects.', babok: 'BABOK 5.5 Approve Requirements · 7.1', effort: '~3 h', owners: ['BA'], output: 'Business Requirements Document outline filled from your artefacts', heavy: true, requires: ['requirements'], when: 'Fixed-price contracts, regulated domains, or large programmes. Skip for agile small changes.' },

  // ---------------- DESIGN ----------------
  { id: 'to-be-process', phase: 'design', title: 'Design the future-state process', why: 'Shows how the solution changes the workflow and who does what.', babok: 'BABOK 6.2 Define Future State · 10.35 Process Modelling', effort: '~45 min', owners: ['BA', 'UX'], output: 'To-be process (Mermaid) + change impact by role', requires: ['requirements'], when: 'When roles, hand-offs or approvals change.' },
  { id: 'solution-options', phase: 'design', title: 'Compare solution options', why: 'Make build / buy / configure trade-offs explicit before committing.', babok: 'BABOK 7.5 Define Design Options · 7.6 Analyze Potential Value and Recommend Solution', effort: '~1 h', owners: ['BA', 'Dev', 'PO'], output: 'Options matrix with value, cost, risk and recommendation', requires: ['requirements'], when: 'More than one feasible way to solve the problem.' },
  { id: 'ux-brief', phase: 'design', title: 'Create the Figma design brief & screen spec', why: 'Designers get exact screens, states and components linked to requirements.', babok: 'BABOK 10.36 Prototyping · 7.4 Define Requirements Architecture', effort: '~45 min', owners: ['UX', 'BA', 'PO'], output: 'Screen list, user flow, states, components from Compass DS, Figma handoff', requires: ['requirements'], when: 'Before UI work starts; whenever a new user-facing flow is added.' },
  { id: 'data-model', phase: 'design', title: 'Model the data (entities & rules)', why: 'Clarifies what information the solution stores and the rules applied to it.', babok: 'BABOK 10.15 Data Modelling · 10.9 Business Rules Analysis', effort: '~40 min', owners: ['BA', 'Dev'], output: 'Entity list, ER diagram (Mermaid), business rules', requires: ['requirements'], when: 'New data is captured, migrated or integrated.' },
  { id: 'tracking-plan', phase: 'design', title: 'Write the analytics tracking plan', why: 'Usage can only be monitored after release if events are designed now.', babok: 'BABOK 8.1 Measure Solution Performance · 10.28 Metrics and KPIs', effort: '~30 min', owners: ['Data', 'PO', 'BA'], output: 'Event list with properties, funnel definition, dashboard spec', requires: ['success-metrics'], when: 'Before development of any feature you will need to measure. Mandatory before release.' },

  // ---------------- BUILD ----------------
  { id: 'user-stories', phase: 'build', title: 'Generate detailed user stories', why: 'Turns requirements into INVEST stories with Gherkin acceptance criteria the team can build.', babok: 'BABOK 10.56 User Stories · 10.1 Acceptance and Evaluation Criteria', effort: '~1 h', owners: ['PO', 'BA'], output: 'Epics → stories with AC, priority, estimate, tracking events', kind: 'stories', requires: ['scope'], when: 'Once scope is agreed. Refine every sprint.' },
  { id: 'prioritisation', phase: 'build', title: 'Prioritise the backlog & story map', why: 'Ensures the first release delivers the most value with the least effort.', babok: 'BABOK 5.3 Prioritize Requirements · 10.33 Prioritization', effort: '~30 min', owners: ['PO'], output: 'Story map by release slice, value vs. effort ranking', requires: ['user-stories'], when: 'Before sprint planning and whenever priorities shift.' },
  { id: 'release-plan', phase: 'build', title: 'Build the delivery / release plan', why: 'Gives stakeholders dates, capacity and milestones they can rely on.', babok: 'BABOK 3.1 Plan BA Approach · Delivery planning (Agile)', effort: '~40 min', owners: ['DM', 'PO'], output: 'Sprint plan, milestones, capacity, definition of done', requires: ['user-stories'], when: 'After first backlog estimate; update each sprint.' },
  { id: 'raid-log', phase: 'build', title: 'Start the RAID log', why: 'Surfaces risks, assumptions, issues and dependencies before they become delays.', babok: 'BABOK 10.38 Risk Analysis and Management', effort: '~30 min', owners: ['DM'], output: 'RAID log with owners, impact and mitigation', requires: ['scope'], when: 'Any project with external dependencies, vendors or fixed dates.' },
  { id: 'test-scenarios', phase: 'build', title: 'Derive test scenarios from AC', why: 'QA starts early, and gaps in acceptance criteria show up before coding.', babok: 'BABOK 7.2 Verify Requirements · 10.1 Acceptance and Evaluation Criteria', effort: '~40 min', owners: ['QA', 'BA'], output: 'Test scenario table: happy path, negative, edge, tracking', requires: ['user-stories'], when: 'As soon as stories have acceptance criteria.' },

  // ---------------- RELEASE ----------------
  { id: 'rollout-plan', phase: 'release', title: 'Plan the rollout (flags, stages, go/no-go)', why: 'Staged rollout limits risk and creates a clean before/after for measurement.', babok: 'BABOK 2.3 Transition Requirements · 6.4 Define Change Strategy', effort: '~40 min', owners: ['DM', 'PO', 'Ops'], output: 'Staged rollout plan, go/no-go checklist, rollback plan', requires: ['release-plan', 'tracking-plan'], when: 'Before every production release that affects end users.' },
  { id: 'uat-plan', phase: 'release', title: 'Prepare UAT', why: 'Business users confirm the solution solves their problem before go-live.', babok: 'BABOK 8.1 Measure Solution Performance · 10.1 Acceptance and Evaluation Criteria', effort: '~30 min', owners: ['QA', 'BA', 'PO'], output: 'UAT plan, participants, scripts, exit criteria', requires: ['test-scenarios'], when: 'Before go/no-go.' },
  { id: 'comms-training', phase: 'release', title: 'Write comms & training plan', why: 'Adoption fails when users don\'t know what changed or why.', babok: 'BABOK 6.4 Define Change Strategy · Organizational readiness', effort: '~30 min', owners: ['Ops', 'PO', 'BA'], output: 'Audience-by-audience comms, release notes, training & support handover', requires: ['rollout-plan'], when: 'Any change visible to users or support teams.' },

  // ---------------- MONITOR ----------------
  { id: 'add-usage-data', phase: 'monitor', title: 'Connect / upload usage data', why: 'Released features need real usage data to evaluate.', babok: 'BABOK 8.1 Measure Solution Performance', effort: '~10 min', owners: ['Data', 'PO'], output: 'Usage dataset and change log on the Monitor dashboard', kind: 'navigate', target: 'monitor', when: 'Day 1 after any release.' },
  { id: 'kpi-review', phase: 'monitor', title: 'Review performance vs. targets', why: 'Compares adoption and KPI movement against the targets agreed in Discover.', babok: 'BABOK 8.2 Analyze Performance Measures', effort: '~30 min', owners: ['PO', 'BA', 'Data'], output: 'Performance report with funnel, trends, change annotations', when: 'Day 1, day 7 and day 30 after release; whenever an alert fires.' },
  { id: 'feedback-interviews', phase: 'monitor', title: 'Collect user feedback', why: 'Numbers say what happened; users tell you why.', babok: 'BABOK 8.4 Assess Enterprise Limitations · 10.25 Interviews · 10.45 Survey', effort: '~45 min', owners: ['BA', 'UX'], output: 'Feedback plan, survey & interview guide, synthesis template', when: 'When adoption or activation is below target.' },
  { id: 'value-recommendation', phase: 'monitor', title: 'Recommend: scale, iterate or roll back', why: 'Closes the loop: a clear decision backed by data.', babok: 'BABOK 8.5 Recommend Actions to Increase Solution Value', effort: '~30 min', owners: ['PO', 'BA', 'Sponsor'], output: 'Decision memo with evidence and next steps', requires: ['kpi-review'], when: 'After a full measurement window (usually 2–4 weeks).' },
];

export const byId = (id: string) => ACTIONS.find((a) => a.id === id)!;

export const PHASE_INFO: Record<Phase, { name: string; vi: string; babok: string; roles: string; goal: string }> = {
  discover: { name: 'Discover', vi: 'Khám phá', babok: 'Strategy Analysis · BA Planning', roles: 'BA, PO, Sponsor', goal: 'Understand the business need: pain points, challenges, opportunities and threats.' },
  define: { name: 'Define', vi: 'Xác định', babok: 'Elicitation & Collaboration · Req. Life Cycle Mgmt', roles: 'BA, PO', goal: 'Elicit and agree scope and requirements with stakeholders.' },
  design: { name: 'Design', vi: 'Thiết kế', babok: 'Requirements Analysis & Design Definition', roles: 'BA, UX, Dev', goal: 'Define the solution: process, UX, data, tracking.' },
  build: { name: 'Build', vi: 'Xây dựng', babok: 'Req. Life Cycle Mgmt · Delivery', roles: 'PO, DM, Dev, QA', goal: 'Backlog, plan, and quality for delivery.' },
  release: { name: 'Release', vi: 'Phát hành', babok: 'Transition · Solution Evaluation (prep)', roles: 'DM, PO, Ops', goal: 'Roll out safely to end users.' },
  monitor: { name: 'Monitor', vi: 'Theo dõi', babok: 'Solution Evaluation', roles: 'PO, BA, Data', goal: 'Measure usage and value; decide scale, iterate or roll back.' },
};

export const ROLE_INFO: Record<string, { name: string; desc: string }> = {
  BA: { name: 'Business Analyst', desc: 'Elicit, analyse, model, write requirements & acceptance criteria' },
  PO: { name: 'Product Owner', desc: 'Own the vision, prioritise, accept, decide scale or roll back' },
  DM: { name: 'Delivery Manager', desc: 'Plan releases, capacity, risks and dependencies' },
  Sponsor: { name: 'Business Sponsor', desc: 'State the intent, approve the case, judge outcomes' },
  UX: { name: 'UX / UI Designer', desc: 'Journeys, wireframes and Figma designs' },
  Dev: { name: 'Tech Lead / Developer', desc: 'Feasibility, options, estimates' },
  QA: { name: 'QA / Tester', desc: 'Test scenarios and UAT' },
  Ops: { name: 'Ops / Change / Support', desc: 'Readiness, comms, training, support' },
  Data: { name: 'Data / Analytics', desc: 'Tracking plan, KPIs and dashboards' },
};

export const isDone = (p: Project, id: string) => {
  if (id === 'user-stories') return p.stories.length > 0;
  if (id === 'add-usage-data') return p.metrics.length > 0;
  return p.artefacts.some((a) => a.actionId === id);
};
