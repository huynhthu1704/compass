import { byId } from './catalog';
import { weekly } from './engine';
import { uid } from './store';
import type { Project, Story } from './types';

const TBC = (s?: string, hint = 'to confirm') => (s && s.trim() ? s.trim() : `_[${hint}]_`);
const list = (s?: string) => (s || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

const VERBS = /^(allow|add|see|view|pay|save|track|create|book|search|filter|get|receive|reduce|compare|manage|edit|upload|download|export|apply|choose|select|check|send|share|request|submit|approve|cancel|change|update|find|log|sign|register|invite|schedule|order|return|rate|review|configure|import|set|use|show|display|notify|calculate|generate|connect)\b/i;
/** "Guest checkout" -> "use guest checkout"; "Track orders" -> "track orders" */
export const act = (f: string) => { const l = f.charAt(0).toLowerCase() + f.slice(1); return VERBS.test(l) ? l : `use ${l}`; };
const singular = (s: string) => s.replace(/(\w+)s$/i, (m, w) => (/(ss|us)$/i.test(m) ? m : w));

export function ctx(p: Project) {
  const who = list(p.answers.affected);
  const features = p.features.length ? p.features : [`Core flow to ${p.intent.replace(/\.$/, '').toLowerCase()}`];
  return {
    intent: p.intent.trim(),
    who: who.length ? who : ['End users', 'Operations team'],
    persona: who[0] ? singular(who[0]).toLowerCase() : 'customer',
    pain: TBC(p.answers.pain, 'current pain & evidence — to confirm'),
    metric: TBC(p.answers.metric, 'success metric — to confirm'),
    constraints: TBC(p.answers.constraints, 'constraints — to confirm'),
    tried: TBC(p.answers.tried, 'previous attempts — to confirm'),
    features,
    domain: p.domain || 'the business',
    type: p.productType,
  };
}

const header = (p: Project, id: string) => {
  const a = byId(id);
  return `> **${a.babok}** · Owner: ${a.owners.join(', ')} · Project: ${p.name}\n\n`;
};

const assumptions = (items: string[]) => `\n## Assumptions\n${items.map((i) => `- ${i}`).join('\n')}\n`;
const openQs = (items: string[]) => `\n## Open questions\n${items.map((i) => `- [ ] ${i}`).join('\n')}\n`;

type Gen = (p: Project) => string;

export const GENERATORS: Record<string, Gen> = {
  'problem-statement': (p) => {
    const c = ctx(p);
    return header(p, 'problem-statement') + `## Problem statement
| | |
|---|---|
| **The problem of** | ${c.pain} |
| **affects** | ${c.who.join(', ')} |
| **the impact of which is** | Lost value against the business goal: _${c.intent}_ |
| **a successful solution would** | Achieve "${c.intent}", measured by ${c.metric} |

## Business need (outcome, not solution)
${c.intent}

## Context
- Domain: ${c.domain} · Product type: ${c.type} · Stage: ${p.stage}
- Constraints: ${c.constraints}
- Already tried: ${c.tried}

## 5 Whys (first pass — validate with data)
1. Why is "${c.intent}" not achieved today? → ${c.pain}
2. Why does that happen? → _[ask ${c.who[0]}]_
3. Why? → _[check process / system data]_
4. Why? → _[check policy / ownership]_
5. Root cause → _[confirm in Root-cause analysis]_
` + assumptions([`The stated outcome reflects the sponsor's real goal`, `${c.who.join(', ')} are the primary affected groups`]) + openQs(['What evidence (data, tickets, complaints) quantifies the pain today?', 'Who owns this outcome on the business side?', 'What happens if we do nothing for 6 months?']);
  },

  'stakeholder-map': (p) => {
    const c = ctx(p);
    const rows = [
      ...c.who.map((w) => [w, 'Affected user', 'Low', 'High', 'Keep informed → involve in elicitation & UAT', 'C']),
      ['Business sponsor', 'Funds & approves', 'High', 'High', 'Manage closely: steering, sign-off', 'A'],
      ['Product Owner', 'Owns backlog & value', 'High', 'High', 'Daily collaboration', 'R'],
      ['Business Analyst', 'Elicits & specifies', 'Medium', 'High', 'Facilitates all elicitation', 'R'],
      ['Delivery Manager', 'Plans & delivers', 'Medium', 'High', 'Weekly planning sync', 'R'],
      ['Tech lead / Dev team', 'Builds solution', 'Medium', 'Medium', 'Refinement & feasibility', 'C'],
      ['Customer support / Ops', 'Supports users after release', 'Low', 'Medium', 'Keep informed; release handover', 'I'],
      ['Legal / Compliance', 'Regulatory approval', 'High', 'Low', 'Keep satisfied: review at gates', 'C'],
    ];
    return header(p, 'stakeholder-map') + `## Stakeholder register
| Stakeholder | Role in change | Power | Interest | Engagement approach | RACI |
|---|---|---|---|---|---|
${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}

## Power–interest grid
| | **Low interest** | **High interest** |
|---|---|---|
| **High power** | Keep satisfied: Legal / Compliance | Manage closely: Sponsor, Product Owner |
| **Low power** | Monitor: — | Keep informed: ${c.who.join(', ')}, Support |

## RACI for key decisions
| Decision | Sponsor | PO | BA | DM | Dev | Users |
|---|---|---|---|---|---|---|
| Approve scope | A | R | C | C | C | I |
| Accept stories | I | A | R | I | C | C |
| Go / no-go release | A | R | C | R | C | I |
| Scale / roll back | A | R | C | C | I | I |
` + openQs(['Who can block this change (IT security, finance, unions, vendors)?', `Who are the most influential voices among ${c.who[0]}?`, 'Which stakeholder has the strongest opinion on the solution already?']);
  },

  swot: (p) => {
    const c = ctx(p);
    return header(p, 'swot') + `## SWOT
| **Strengths (internal)** | **Weaknesses (internal)** |
|---|---|
| Existing ${c.type} customer base / channels · Team knowledge of ${c.domain} · _[add]_ | ${c.pain} · Gaps in data / tooling · _[add]_ |
| **Opportunities (external)** | **Threats (external)** |
| Achieve: ${c.intent} · New segments or upsell · Process automation · _[add]_ | Competitors solve it first · Regulation: ${c.constraints} · User churn if pain persists |

## Opportunity sizing (fill the numbers)
| Driver | Current | Target | Value / year |
|---|---|---|---|
| ${c.metric} | _[baseline]_ | _[target]_ | _[= delta × unit value]_ |
| Cost to serve / manual effort | _[hours/month]_ | _[hours/month]_ | _[hours saved × rate]_ |
| Risk avoided | _[incidents/yr]_ | _[incidents/yr]_ | _[cost per incident]_ |

## So what?
- **Build on:** strengths that make the opportunity winnable.
- **Fix first:** weaknesses that block "${c.intent}".
- **Watch:** threats that change urgency or scope.
` + openQs(['Which competitor or workaround do users use today?', 'What is the cost of delay per month?']);
  },

  'root-cause': (p) => {
    const c = ctx(p);
    return header(p, 'root-cause') + `## Effect (the problem)
${c.pain}

## Fishbone (Ishikawa)
| Category | Possible causes | Evidence to collect |
|---|---|---|
| People | Skills, training, unclear ownership | Interviews with ${c.who[0]}; support team |
| Process | Too many steps, manual hand-offs, approvals | As-is process map, cycle-time data |
| Technology | Slow / missing features, integration failures | Error logs, performance metrics |
| Data | Incomplete or inconsistent data | Data quality report |
| Policy | Rules or regulation (${c.constraints}) | Policy documents |
| Environment / Market | Competitor alternatives, seasonality | Market research, trend data |

## 5 Whys (template)
| # | Why? | Answer | Evidence |
|---|---|---|---|
| 1 | Why does "${c.pain}" happen? | | |
| 2 | Why? | | |
| 3 | Why? | | |
| 4 | Why? | | |
| 5 | Root cause | | |

## Validation plan
1. Pick the top 2–3 likely causes with stakeholders (dot-voting).
2. Confirm each with data before designing solutions.
3. Record confirmed root cause in the problem statement.
`;
  },

  'as-is-process': (p) => {
    const c = ctx(p);
    return header(p, 'as-is-process') + `## Current-state process (edit the steps)
\`\`\`mermaid
flowchart LR
  A([${c.persona} starts]) --> B[Submit request / start task]
  B --> C{Manual check}
  C -- OK --> D[Process in system]
  C -- Missing info --> E[Back-and-forth by email]
  E --> B
  D --> F[Notify ${c.persona}]
  F --> G([Done])
\`\`\`
_Paste into mermaid.live or a Markdown viewer that supports Mermaid to see the diagram._

## Pain points on the map
| Step | Pain point | Who feels it | Frequency | Evidence |
|---|---|---|---|---|
| Manual check | Delays, inconsistent decisions | ${c.who.join(', ')} | _[daily?]_ | _[cycle time]_ |
| Back-and-forth | Rework, frustration | ${c.persona} | _[x% of cases]_ | _[tickets]_ |
| Notify | User doesn't know status | ${c.persona} | | |

## Process metrics (baseline)
- Cycle time: _[ ]_ · Rework rate: _[ ]_ · Volume / month: _[ ]_ · Cost per case: _[ ]_
` + openQs(['Who performs each step and with which system?', 'Where are the hand-offs between teams?', 'What exceptions happen most often?']);
  },

  'success-metrics': (p) => {
    const c = ctx(p);
    return header(p, 'success-metrics') + `## Objective (qualitative)
${c.intent}

## Key results (measurable, time-bound)
| KR | Metric | Baseline | Target | By when | Source |
|---|---|---|---|---|---|
| KR1 | ${c.metric} | _[ ]_ | _[ ]_ | _[date]_ | _[analytics / BI]_ |
| KR2 | Feature activation rate (activated ÷ exposed users) | 0% | _[e.g. 30%]_ | 4 weeks after release | Product analytics |
| KR3 | 4-week retention of activated users | – | _[e.g. 40%]_ | 8 weeks after release | Product analytics |
| KR4 | Satisfaction (CSAT) for the new flow | _[ ]_ | ≥ 4/5 | after release | In-app survey |

## KPI tree
\`\`\`
${c.intent}
├── Outcome KPI: ${c.metric.replace(/_/g, '')}
│   ├── Adoption: exposed → tried → activated
│   ├── Engagement: frequency of use, retention
│   └── Quality: error rate, task success, support tickets
└── Guardrails: no drop in conversion, NPS, performance
\`\`\`

## Leading vs. lagging
- **Leading (week 1–2):** try rate, activation rate, task success.
- **Lagging (month 1–3):** ${c.metric.replace(/_/g, '')}, retention, revenue / cost impact.
` + assumptions(['Baseline data can be extracted from current systems', 'Analytics events will be added (see Tracking plan)']) + openQs(['Who signs off the targets?', 'What is the minimum result that still counts as success?']);
  },

  'business-case': (p) => {
    const c = ctx(p);
    return header(p, 'business-case') + `## 1. Executive summary
Investment to achieve: **${c.intent}**. Recommended option: _[Option B]_.

## 2. Problem & opportunity
${c.pain}

## 3. Options
| Option | Description | Cost (one-off / run) | Benefit / year | Risk | Time to value |
|---|---|---|---|---|---|
| A. Do nothing | Keep current process | 0 / current | 0 | Pain grows | – |
| B. Minimum viable change | ${c.features[0]} | _[ ]_ | _[ ]_ | Low | _[weeks]_ |
| C. Full solution | ${c.features.join(', ')} | _[ ]_ | _[ ]_ | Medium | _[months]_ |

## 4. Benefits
- Measured by: ${c.metric}
- Secondary: reduced manual effort, better data, customer satisfaction.

## 5. Costs & ROI
ROI = (Benefit − Cost) ÷ Cost · Payback = Cost ÷ monthly benefit.

## 6. Risks & constraints
${c.constraints}

## 7. Recommendation & approval
Decision requested from sponsor by _[date]_.
`;
  },

  'elicitation-plan': (p) => {
    const c = ctx(p);
    const groups = [...c.who, 'Business sponsor', 'Operations / Support', 'Tech lead'];
    return header(p, 'elicitation-plan') + `## Plan
| Stakeholder group | Technique | Goal | Duration | When |
|---|---|---|---|---|
${groups.map((g, i) => `| ${g} | ${i < c.who.length ? 'Interview (1:1) + observation' : i === c.who.length ? 'Interview' : 'Workshop'} | ${i < c.who.length ? 'Understand tasks, pains, workarounds' : i === c.who.length ? 'Confirm goals, constraints, priorities' : 'Feasibility, data, integrations'} | 45–60 min | Week _[ ]_ |`).join('\n')}
| All key stakeholders | Requirements workshop | Agree scope & priorities (MoSCoW) | 2 h | After interviews |

## Question bank
### ${c.who[0]} (users)
- Walk me through the last time you tried to do this. What happened?
- Where do you get stuck or need help?
- What workarounds do you use today?
- If this worked perfectly, what would be different for you?

### Sponsor
- Why now? What happens if we don't do this?
- How will you judge success in 3 months? (Confirm: ${c.metric})
- What is out of the question (budget, time, policy)?

### Operations / Support
- What are the most common complaints or tickets?
- Which exceptions take the most time?

### Tech lead
- Which systems and data are involved? Any integration limits?
- What is risky or unknown technically?

## Logistics & outputs
- Notes template: context · pains · needs · quotes · follow-ups.
- Confirm notes with each interviewee within 48 h (BABOK 4.3 Confirm Elicitation Results).
`;
  },

  scope: (p) => {
    const c = ctx(p);
    return header(p, 'scope') + `## Scope statement
Deliver the minimum change that achieves **${c.intent}**, measured by ${c.metric}.

## Capabilities (MoSCoW)
| # | Capability | Priority | Rationale |
|---|---|---|---|
${c.features.map((f, i) => `| C${i + 1} | ${f} | ${i === 0 ? 'Must' : i < 3 ? 'Should' : 'Could'} | ${i === 0 ? 'Directly drives the outcome' : 'Supports adoption / efficiency'} |`).join('\n')}
| C${c.features.length + 1} | Analytics events & dashboard | Must | Needed to monitor usage after rollout |

## Out of scope (this release)
- Changes to unrelated workflows or systems
- Migration of historical data _[confirm]_
- _[add]_

## Constraints
${c.constraints}
` + assumptions(['Existing systems can be extended without re-platforming', `${c.who.join(', ')} are available for UAT`]) + openQs(['Which capability can we drop if the deadline is at risk?', 'Is there a regulatory reason any item is Must?']);
  },

  requirements: (p) => {
    const c = ctx(p);
    let n = 1;
    const fr = c.features.flatMap((f) => [`| FR-${String(n++).padStart(2, '0')} | The system shall allow a ${c.persona} to ${act(f)}. | Must | Scope | |`, `| FR-${String(n++).padStart(2, '0')} | The system shall validate inputs for "${f}" and show clear error messages. | Should | Elicitation | |`]);
    return header(p, 'requirements') + `## Business requirements
| ID | Requirement | Priority | Source |
|---|---|---|---|
| BR-01 | The business shall ${c.intent.charAt(0).toLowerCase() + c.intent.slice(1).replace(/\.$/, '')}. | Must | Sponsor |
| BR-02 | The business shall be able to measure ${c.metric} after release. | Must | Success metrics |

## Stakeholder / functional requirements
| ID | Requirement | Priority | Source | Trace → story |
|---|---|---|---|---|
${fr.join('\n')}
| FR-${String(n++).padStart(2, '0')} | The system shall record analytics events for each key step of the new flow. | Must | Tracking plan | |

## Non-functional requirements
| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Key screens load in < 2 s for 95% of requests |
| NFR-02 | Accessibility | Meets WCAG 2.2 AA |
| NFR-03 | Security & privacy | Personal data handled per policy; role-based access |
| NFR-04 | Availability | 99.5% during business hours |
| NFR-05 | Localisation | Supports EN / VI _[confirm]_ |

## Transition requirements
- Training for ${c.who.join(', ')} · Support handover · Feature flag for staged rollout.

## Verification checklist (BABOK 7.2)
- [ ] Atomic, unambiguous, testable · [ ] Traced to a business requirement · [ ] Prioritised · [ ] Owner agreed
`;
  },

  glossary: (p) => {
    const c = ctx(p);
    return header(p, 'glossary') + `## Glossary
| Term | Definition | Synonyms / avoid | Owner |
|---|---|---|---|
| ${c.persona} | Primary user affected by this change | | PO |
| Activation | A user who completes the key action of the new feature at least once | "usage" (too vague) | Data |
| Business need | ${c.intent} | | Sponsor |
| _[term]_ | _[definition]_ | | |

Tip: add every acronym you hear in interviews; confirm definitions with the business owner.
`;
  },

  brd: (p) => {
    const sec = (id: string, t: string) => {
      const a = p.artefacts.find((x) => x.actionId === id);
      return `## ${t}\n${a ? a.content.replace(/^> .*\n\n/, '').replace(/^## /gm, '### ') : '_Not yet produced — run the related action first._'}\n`;
    };
    return header(p, 'brd') + `# Business Requirements Document — ${p.name}
Version 0.1 · Status: Draft

` + sec('problem-statement', '1. Business need') + sec('stakeholder-map', '2. Stakeholders') + sec('success-metrics', '3. Objectives & success metrics') + sec('scope', '4. Scope') + sec('requirements', '5. Requirements') + sec('glossary', '6. Glossary') + `## 7. Approval
| Name | Role | Decision | Date |
|---|---|---|---|
| | Sponsor | | |
| | Product Owner | | |
`;
  },

  'to-be-process': (p) => {
    const c = ctx(p);
    return header(p, 'to-be-process') + `## Future-state process
\`\`\`mermaid
flowchart LR
  A([${c.persona} starts]) --> B[${c.features[0]}]
  B --> C{Automatic validation}
  C -- valid --> D[Processed instantly]
  C -- needs info --> E[Inline guidance, same screen]
  E --> B
  D --> F[Real-time status + notification]
  F --> G([Outcome achieved])
\`\`\`

## Change impact by role
| Role | Today | Future | Impact | Readiness action |
|---|---|---|---|---|
${c.who.map((w) => `| ${w} | Manual steps, waiting | Self-service, guided flow | Medium | Short training / in-app tips |`).join('\n')}
| Operations | Manual checks | Exceptions only | High | Updated SOP, training |
| Support | Status questions | Fewer tickets | Low | Release notes, FAQ |

## Business rules introduced
- BR-R1: _[e.g. requests above X need approval]_
- BR-R2: _[ ]_
`;
  },

  'solution-options': (p) => {
    const c = ctx(p);
    return header(p, 'solution-options') + `## Options
| Criteria (weight) | A. Configure existing tool | B. Build in-house | C. Buy SaaS / partner |
|---|---|---|---|
| Value to "${c.intent}" (30%) | 3 | 5 | 4 |
| Cost (20%) | 5 | 2 | 3 |
| Time to market (20%) | 5 | 2 | 4 |
| Risk / complexity (15%) | 4 | 2 | 3 |
| Fit with constraints (15%) | _[ ]_ | _[ ]_ | _[ ]_ |
| **Weighted score** | _[calc]_ | _[calc]_ | _[calc]_ |

_Scores 1–5 are placeholders — agree them with the tech lead and sponsor._

## Recommendation
Option _[ ]_ because it delivers the Must capabilities (${c.features.slice(0, 2).join(', ')}) fastest within ${c.constraints}.

## Potential value (BABOK 7.6)
- Expected benefit: ${c.metric}
- Key risks & mitigations: _[ ]_
`;
  },

  'ux-brief': (p) => {
    const c = ctx(p);
    const screens = [
      ['Entry point / dashboard', 'Where the user discovers the new capability', 'Badge (New), Button Accent, Card'],
      ...c.features.map((f) => [f, `Main task screen to ${act(f)}`, 'Input, Button Primary, Phase Chip, inline help']),
      ['Confirmation & status', 'Shows result and next step', 'Card, Badge (Success), Button Secondary'],
      ['Empty & error states', 'No data, validation errors, offline', 'Input (Error), empty state, Button Ghost'],
    ];
    return header(p, 'ux-brief') + `## Design goal
Help ${c.persona} achieve **${c.intent}** with the fewest steps and clear feedback.

## Primary user flow
${c.who[0]} → entry point → ${c.features.join(' → ')} → confirmation → (optional) feedback

## Screen spec
| # | Screen | Purpose | Key components (Compass DS) | States |
|---|---|---|---|---|
${screens.map((s, i) => `| S${i + 1} | ${s[0]} | ${s[1]} | ${s[2]} | default · loading · error · empty |`).join('\n')}

## Content & UX rules
- One primary call-to-action per screen; use the Accent button only for the recommended action.
- Inline validation; errors say how to fix, not just what's wrong.
- Every key step fires an analytics event (see Tracking plan).

## Figma handoff
- Design system: Compass DS v0.1 — https://www.figma.com/design/5e1GvRGmOSfiPS8HeoTkrr
- Frames: 1440 desktop + 390 mobile per screen · Name frames \`S1 / Screen name / State\`.
- Link each frame to its requirement ID (FR-xx) and story key (US-xx) in the frame description.
- Use the "Export layout spec (JSON)" button on this page to hand the screen list to a Figma plugin or AI design tool.
` + openQs(['Which device do most users use?', 'Any brand constraints beyond the design system?']);
  },

  'data-model': (p) => {
    const c = ctx(p);
    return header(p, 'data-model') + `## Entities
\`\`\`mermaid
erDiagram
  USER ||--o{ REQUEST : creates
  REQUEST ||--|{ REQUEST_ITEM : contains
  REQUEST }o--|| STATUS : has
  REQUEST ||--o{ EVENT : logs
  USER { string id string role string segment }
  REQUEST { string id date created string channel }
  EVENT { string name datetime ts json props }
\`\`\`
_Rename entities to your domain (${c.domain})._

## Business rules
| ID | Rule | Type | Enforced where |
|---|---|---|---|
| R-01 | _[e.g. A request must have an owner]_ | Definitional | Data model |
| R-02 | _[e.g. Requests > X require approval]_ | Behavioural | Workflow |

## Data quality & privacy
- Personal data fields: _[list]_ · Retention: _[ ]_ · Access: role-based.
`;
  },

  'tracking-plan': (p) => {
    const c = ctx(p);
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
    const ev = c.features.flatMap((f) => [[`${slug(f)}_viewed`, `User sees ${f}`, 'source, segment'], [`${slug(f)}_started`, `User starts ${f}`, 'entry_point'], [`${slug(f)}_completed`, `User completes ${f} (activation)`, 'duration_s, result']]);
    return header(p, 'tracking-plan') + `## Funnel definition
**Exposed** (saw the feature) → **Tried** (started) → **Activated** (completed key action) → **Retained** (activated again within 28 days)

## Events
| Event name | Trigger | Properties | Funnel step |
|---|---|---|---|
${ev.map((e, i) => `| \`${e[0]}\` | ${e[1]} | ${e[2]} | ${['Exposed', 'Tried', 'Activated'][i % 3]} |`).join('\n')}
| \`feature_feedback_submitted\` | User rates the flow | score, comment | – |

Common properties on all events: \`user_id, session_id, platform, app_version, feature_flag_variant\`.

## Dashboard spec
- Adoption funnel (daily / weekly) · Activation rate · 4-week retention · ${c.metric.replace(/_/g, '')} vs. target
- Annotations for every release / change (from Compass change log)
- Alert: activations drop > ${p.alertThreshold}% week-on-week → notify PO & DM

## Data QA before release
- [ ] Events fire in staging · [ ] Properties populated · [ ] No PII in free-text properties · [ ] Dashboard reviewed by PO
`;
  },

  prioritisation: (p) => {
    const rows = [...p.stories].sort((a, b) => ['Must', 'Should', 'Could', "Won't"].indexOf(a.priority) - ['Must', 'Should', 'Could', "Won't"].indexOf(b.priority));
    return header(p, 'prioritisation') + `## Story map
| Epic | Release 1 (MVP) | Release 2 | Later |
|---|---|---|---|
${[...new Set(p.stories.map((s) => s.epic))].map((e) => { const st = p.stories.filter((s) => s.epic === e); return `| ${e} | ${st.filter((s) => s.priority === 'Must').map((s) => s.key).join(', ') || '–'} | ${st.filter((s) => s.priority === 'Should').map((s) => s.key).join(', ') || '–'} | ${st.filter((s) => s.priority === 'Could' || s.priority === "Won't").map((s) => s.key).join(', ') || '–'} |`; }).join('\n')}

## Value vs. effort
| Key | Story | Priority | Points | Value/effort note |
|---|---|---|---|---|
${rows.map((s) => `| ${s.key} | ${s.title} | ${s.priority} | ${s.points} | ${s.priority === 'Must' && s.points <= 3 ? 'Quick win' : s.priority === 'Must' ? 'Big bet — consider splitting' : s.points >= 5 ? 'Defer / split' : 'Fill-in'} |`).join('\n')}

**MVP total:** ${p.stories.filter((s) => s.priority === 'Must').reduce((a, s) => a + s.points, 0)} points.
`;
  },

  'release-plan': (p) => {
    const must = p.stories.filter((s) => s.priority === 'Must');
    const pts = p.stories.reduce((a, s) => a + s.points, 0);
    const velocity = 20;
    const sprints = Math.max(1, Math.ceil(pts / velocity));
    return header(p, 'release-plan') + `## Assumptions
- Sprint length 2 weeks · Team velocity ~${velocity} points _[replace with your team's average]_ · Backlog total ${pts} points.

## Plan
| Sprint | Goal | Stories | Milestone |
|---|---|---|---|
${Array.from({ length: sprints }, (_, i) => { const chunk = p.stories.slice(Math.floor((i * p.stories.length) / sprints), Math.floor(((i + 1) * p.stories.length) / sprints)); return `| Sprint ${i + 1} | ${i === 0 ? 'Walking skeleton + tracking' : i === sprints - 1 ? 'Hardening, UAT fixes' : 'Core capabilities'} | ${chunk.map((s) => s.key).join(', ')} | ${i === sprints - 1 ? 'Go / no-go' : ''} |`; }).join('\n')}
| Release | Staged rollout 5% → 25% → 100% | – | Launch |

## MVP scope (Must): ${must.map((s) => s.key).join(', ') || '—'}

## Definition of Ready
- [ ] Story has clear AC (Gherkin) · [ ] Estimated · [ ] Dependencies known · [ ] Design linked · [ ] Tracking events listed

## Definition of Done
- [ ] AC pass · [ ] Code reviewed · [ ] Tests automated where possible · [ ] Events verified · [ ] Docs / release notes updated · [ ] PO accepted
`;
  },

  'raid-log': (p) => {
    const c = ctx(p);
    return header(p, 'raid-log') + `## RAID log
| Type | ID | Description | Impact | Likelihood | Owner | Mitigation / action | Status |
|---|---|---|---|---|---|---|---|
| Risk | R1 | Stakeholders unavailable for elicitation/UAT | High | Medium | DM | Book sessions early; delegate | Open |
| Risk | R2 | Constraint: ${c.constraints} | High | _[ ]_ | PO | Early review with owner | Open |
| Risk | R3 | Low adoption after release | High | Medium | PO | Tracking plan, comms, staged rollout | Open |
| Assumption | A1 | Existing systems can be extended | Medium | – | Tech lead | Spike in sprint 1 | To validate |
| Issue | I1 | _[ ]_ | | | | | |
| Dependency | D1 | Analytics / data team for events & dashboard | Medium | – | DM | Agree timeline | Open |
`;
  },

  'test-scenarios': (p) => {
    return header(p, 'test-scenarios') + `## Test scenarios (derived from acceptance criteria)
| ID | Story | Scenario | Type | Expected result |
|---|---|---|---|---|
${p.stories.flatMap((s) => s.ac.map((ac, i) => `| TS-${s.key.replace('US-', '')}.${i + 1} | ${s.key} | ${ac.replace(/\|/g, '/').replace(/\n/g, ' ')} | ${/error|invalid|fail|not/i.test(ac) ? 'Negative' : 'Happy path'} | As per AC |`)).join('\n')}
${p.stories.slice(0, 3).map((s) => `| TS-${s.key.replace('US-', '')}.T | ${s.key} | Analytics events fire: ${s.events.join(', ') || '–'} | Tracking | Events visible in debugger |`).join('\n')}

## Coverage notes
- Add boundary tests for every numeric rule · accessibility check (keyboard, screen reader) · performance smoke test.
`;
  },

  'rollout-plan': (p) => {
    const c = ctx(p);
    return header(p, 'rollout-plan') + `## Staged rollout
| Stage | Audience | Duration | Success gate to continue |
|---|---|---|---|
| 0. Internal | Team & support staff | 2–3 days | No P1 bugs; events verified |
| 1. Pilot 5% | Low-risk segment of ${c.persona} | 3–5 days | Error rate < 1%; activation ≥ _[ ]_% |
| 2. 25% | Wider segment | 1 week | KPIs trending to target; support tickets normal |
| 3. 100% | Everyone | – | Go decision by PO + DM |

Feature flag: \`ff_${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}\` · Log every stage change in Compass → Release → Change log (it annotates the Monitor charts).

## Go / no-go checklist
- [ ] All Must stories accepted · [ ] UAT signed off · [ ] Tracking events verified in production
- [ ] Support trained & FAQ published · [ ] Rollback tested · [ ] Comms scheduled · [ ] On-call agreed

## Rollback plan
- Trigger: error rate > _[x]_%, critical bug, or activation drop > ${p.alertThreshold}% vs. control.
- Action: switch flag off → notify stakeholders → incident review within 48 h.
`;
  },

  'uat-plan': (p) => {
    const c = ctx(p);
    return header(p, 'uat-plan') + `## UAT plan
- **Objective:** confirm the solution lets ${c.persona} achieve "${c.intent}".
- **Participants:** ${c.who.join(', ')} (3–5 people each) · Facilitator: BA · Decision: PO
- **Environment:** staging with production-like data · **Duration:** 3–5 days

## Scripts
| # | Scenario (business language) | Story | Pass / Fail | Comments |
|---|---|---|---|---|
${p.stories.filter((s) => s.priority === 'Must').map((s, i) => `| ${i + 1} | ${s.iWant} | ${s.key} | | |`).join('\n') || '| 1 | _[scenario]_ | | | |'}

## Exit criteria
- 100% Must scenarios pass · No open P1/P2 defects · Sign-off from business owner.
`;
  },

  'comms-training': (p) => {
    const c = ctx(p);
    return header(p, 'comms-training') + `## Communication plan
| Audience | Message | Channel | When | Owner |
|---|---|---|---|---|
${c.who.map((w) => `| ${w} | What's new, why it helps, how to start | In-app banner + email | Launch day | PO |`).join('\n')}
| Support / Ops | What changed, FAQ, escalation path | Briefing + knowledge base | 1 week before | BA |
| Sponsor & leadership | Release status & first metrics | Email update | Launch + day 7 | DM |

## Release notes (draft)
**New:** ${c.features.join(', ')}. This helps you ${c.intent.charAt(0).toLowerCase() + c.intent.slice(1)}.

## Training & support handover
- 15-min walkthrough video · In-app tips on first use · FAQ (top 10 questions) · Known issues list.
`;
  },

  'kpi-review': (p) => {
    const w = weekly(p.metrics);
    const c = ctx(p);
    const rel = p.changelog.slice().sort((a, b) => a.date.localeCompare(b.date));
    const verdict = w.wow <= -p.alertThreshold ? 'Investigate — activations are dropping' : w.activationRate >= 30 ? 'On track — consider scaling rollout' : 'Below target — iterate on onboarding / discoverability';
    return header(p, 'kpi-review') + `## Summary (last 7 days)
| Metric | Value | vs. previous 7 days |
|---|---|---|
| Exposed users | ${w.cur.exposed} | ${w.prev.exposed ? (((w.cur.exposed - w.prev.exposed) / w.prev.exposed) * 100).toFixed(1) + '%' : '–'} |
| Try rate | ${w.tryRate.toFixed(1)}% | |
| Activation rate | ${w.activationRate.toFixed(1)}% | Activations ${w.wow >= 0 ? '+' : ''}${w.wow.toFixed(1)}% WoW |
| Retention (retained ÷ activated) | ${w.retention.toFixed(1)}% | |

**Target:** ${c.metric}

## Changes in the period
${rel.length ? rel.map((r) => `- ${r.date} · ${r.type} · ${r.title} (${r.rollout}%)`).join('\n') : '- No changes logged'}

## Verdict
**${verdict}.**

## Analysis prompts
- Where is the biggest drop in the funnel (exposed → tried → activated)?
- Did any change in the log line up with a metric shift?
- Which segment performs best / worst?
`;
  },

  'feedback-interviews': (p) => {
    const c = ctx(p);
    return header(p, 'feedback-interviews') + `## Feedback plan
| Method | Who | Size | Goal |
|---|---|---|---|
| In-app micro-survey (1–2 questions) | Users who tried but didn't activate | 100+ | Find blockers |
| 1:1 interviews (30 min) | 5 activated + 5 dropped ${c.persona} | 10 | Understand why |
| Support ticket review | Last 30 days | all | Spot recurring issues |

## Survey questions
1. How easy was it to ${act(c.features[0])}? (1–5)
2. What almost stopped you? (free text)

## Interview guide
- Tell me about the last time you used it. What were you trying to do?
- What happened next? Where did you hesitate?
- What would make you use it every week?

## Synthesis template
| Theme | Evidence (quotes / counts) | Impact on KPI | Suggested change |
|---|---|---|---|
| | | | |
`;
  },

  'value-recommendation': (p) => {
    const w = weekly(p.metrics);
    const c = ctx(p);
    const rec = w.wow <= -p.alertThreshold ? 'Pause / roll back to the last stable stage while fixing the root cause' : w.activationRate >= 30 ? 'Scale to 100% and plan the next increment' : 'Iterate: improve onboarding and discoverability, then re-measure for 2 weeks';
    return header(p, 'value-recommendation') + `## Decision requested
**Recommendation:** ${rec}.

## Evidence
- Activation rate ${w.activationRate.toFixed(1)}% · Retention ${w.retention.toFixed(1)}% · Activations ${w.wow.toFixed(1)}% WoW
- Target: ${c.metric}
- Feedback themes: _[from feedback synthesis]_

## Options considered
| Option | When it fits | Risk |
|---|---|---|
| Scale | KPIs at/above target, low error rate | Hidden issues at higher volume |
| Iterate | Adoption below target but positive feedback | Delay to value |
| Roll back | KPIs dropping, harm to guardrail metrics | Lost momentum, rework |

## Next steps
1. _[ ]_ — owner — date
2. Update roadmap & communicate decision to stakeholders.
`;
  },
};

// ---------------- user stories ----------------
export function generateStories(p: Project): Story[] {
  const c = ctx(p);
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
  const outcome = c.intent.charAt(0).toLowerCase() + c.intent.slice(1).replace(/\.$/, '');
  let n = (p.stories.length ? Math.max(...p.stories.map((s) => +s.key.replace('US-', ''))) : 0) + 1;
  const stories: Story[] = [];
  c.features.forEach((f, i) => {
    const a = act(f);
    const pr = i === 0 ? 'Must' : i < 3 ? 'Should' : 'Could';
    stories.push({
      id: uid(), key: `US-${n++}`, epic: f, feature: f, title: f, asA: c.persona, iWant: `to ${a}`, soThat: `I can reach my goal with less effort (business goal: ${outcome})`,
      ac: [
        `Given I am a ${c.persona}\nWhen I ${a}\nThen I see the information and actions I need to complete it`,
        `Given I have entered valid information\nWhen I submit\nThen the result is saved and I see a confirmation within 2 seconds`,
        `Given a required field is missing or invalid\nWhen I submit\nThen I see an inline error explaining how to fix it and nothing is lost`,
      ],
      priority: pr as Story['priority'], points: 5, status: 'To do', events: [`${slug(f)}_started`, `${slug(f)}_completed`],
    });
    stories.push({
      id: uid(), key: `US-${n++}`, epic: f, feature: f, title: `${f} — confirmation & feedback`, asA: c.persona, iWant: `clear confirmation and next steps after I ${a}`, soThat: "I don't need to contact support to know what happens next",
      ac: [`Given I have completed the step to ${a}\nWhen the result is ready\nThen I see a confirmation with what happens next`, `Given something went wrong\nWhen I ${a}\nThen I see a clear message and a way to retry without losing my input`],
      priority: (i === 0 ? 'Should' : 'Could') as Story['priority'], points: 3, status: 'To do', events: [`${slug(f)}_status_viewed`],
    });
  });
  stories.push({
    id: uid(), key: `US-${n++}`, epic: 'Measurement', feature: 'Analytics', title: 'Adoption dashboard', asA: 'Product Owner', iWant: 'to see exposed, tried, activated and retained users for the new feature', soThat: `I can decide whether to scale, iterate or roll back based on ${c.metric.replace(/_/g, '')}`,
    ac: [`Given the feature is live\nWhen I open the dashboard\nThen I see the daily funnel and activation rate with release annotations`, `Given activations drop more than ${p.alertThreshold}% week-on-week\nWhen the weekly check runs\nThen the PO and DM are alerted`],
    priority: 'Must', points: 5, status: 'To do', events: [],
  });
  return stories;
}

// ---------------- exports ----------------
export function storiesToCSV(stories: Story[]) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const head = ['Issue Type', 'Summary', 'Description', 'Priority', 'Story Points', 'Epic Name', 'Labels'];
  const pmap: Record<string, string> = { Must: 'Highest', Should: 'High', Could: 'Medium', "Won't": 'Low' };
  const rows = stories.map((s) => [
    'Story', `${s.key} ${s.title}`,
    `As a ${s.asA}, I want ${s.iWant}, so that ${s.soThat}.\n\nAcceptance criteria:\n${s.ac.map((a, i) => `AC${i + 1}:\n${a}`).join('\n\n')}\n\nTracking events: ${s.events.join(', ') || '-'}`,
    pmap[s.priority], String(s.points), s.epic, 'compass',
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export function storyToMarkdown(s: Story) {
  return `### ${s.key} · ${s.title}\n**Epic:** ${s.epic} · **Priority:** ${s.priority} · **Points:** ${s.points} · **Status:** ${s.status}\n\n> As a **${s.asA}**, I want **${s.iWant}**, so that **${s.soThat}**.\n\n**Acceptance criteria**\n${s.ac.map((a, i) => `\n_AC${i + 1}_\n\`\`\`gherkin\n${a}\n\`\`\``).join('\n')}\n\n**Tracking events:** ${s.events.map((e) => `\`${e}\``).join(', ') || '–'}\n`;
}

export function projectToMarkdown(p: Project) {
  const parts = [`# ${p.name}\n\n**Business intent:** ${p.intent}\n\n**Domain:** ${p.domain} · **Type:** ${p.productType} · **Stage:** ${p.stage} · **Size:** ${p.size}\n`];
  for (const a of p.artefacts) parts.push(`\n---\n\n# ${a.title} (${a.status}, v${a.version})\n\n${a.content}`);
  if (p.stories.length) parts.push(`\n---\n\n# User stories\n\n${p.stories.map(storyToMarkdown).join('\n')}`);
  if (p.changelog.length) parts.push(`\n---\n\n# Change log\n\n${p.changelog.map((c) => `- ${c.date} · ${c.type} · ${c.title} (${c.rollout}%)`).join('\n')}`);
  return parts.join('\n');
}

export function figmaLayoutSpec(p: Project) {
  const c = ctx(p);
  return JSON.stringify({
    designSystem: 'Compass DS v0.1', figmaFile: 'https://www.figma.com/design/5e1GvRGmOSfiPS8HeoTkrr',
    project: p.name, goal: c.intent, persona: c.persona,
    frames: [
      { id: 'S1', name: 'Entry point', size: [1440, 1024], components: ['Badge/Tone=Accent', 'Button/Style=Accent', 'Card'] },
      ...c.features.map((f, i) => ({ id: `S${i + 2}`, name: f, size: [1440, 1024], components: ['Input', 'Button/Style=Primary', 'Phase Chip'], states: ['default', 'loading', 'error', 'empty'], stories: p.stories.filter((s) => s.feature === f).map((s) => s.key) })),
      { id: `S${c.features.length + 2}`, name: 'Confirmation & status', size: [1440, 1024], components: ['Card', 'Badge/Tone=Success'] },
    ],
  }, null, 2);
}

export function download(name: string, content: string, type = 'text/markdown') {
  const blob = new Blob([content], { type: type + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function sampleMetrics(p: Project) {
  const rows = [];
  const start = new Date();
  start.setDate(start.getDate() - 27);
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ramp = Math.min(1, (i + 3) / 14);
    const dip = i > 20 ? 0.75 : 1;
    const exposed = Math.round((400 + Math.random() * 60) * ramp);
    const tried = Math.round(exposed * (0.45 + Math.random() * 0.05));
    const activated = Math.round(tried * (0.6 + Math.random() * 0.05) * dip);
    rows.push({ date: d.toISOString().slice(0, 10), exposed, tried, activated, retained: Math.round(activated * 0.4) });
  }
  void p;
  return rows;
}
