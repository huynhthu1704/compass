import { DEFAULT_GUARDRAILS, FRAMEWORK_VERSION } from '../framework';
import { AGENTS } from '../harness';
import { Badge, PageHead, STAGE_INFO } from '../ui';

const LAYERS = [
  { n: '1', name: 'Agent Harness', cls: 'phase-discover', items: ['Plans each run from the stage & goal', 'Per-agent system prompt, tool allow-list and turn budget (≤14)', 'Full trace: plan → retrieve → tool calls → model turns → checks', 'Human approval gate before spec changes or any GitHub write', 'Demo mode: same pipeline without API keys'] },
  { n: '2', name: 'RAG', cls: 'phase-define', items: ['Indexes repo files (code, docs, config) + compass/spec.json', 'Markdown split by heading, code by 60-line windows', 'BM25 retrieval in the browser, ≤2 chunks per file', 'Top chunks injected as [S1..Sn] and cited by agents', 'search_knowledge tool for follow-up retrieval'] },
  { n: '3', name: 'Tool calling', cls: 'phase-build', items: ['Claude tool_use loop (Messages API)', 'Read tools: search_knowledge, list_files, read_file', 'Write tools only stage proposals: save_idea, save_requirements, save_tests, propose_file_change', 'GitHub writes (branch, commit, PR, merge, release) are done by the harness after approval — never by the model'] },
  { n: '4', name: 'Evaluation & Guardrails', cls: 'phase-release', items: ['Input: prompt-injection scan of retrieved content', 'Output: secrets, forbidden & protected paths, change size, deletions, dependency changes, requirement traceability', 'Evals: story format, testable AC, ambiguity, coverage, traceability, negative paths, tests-with-code', 'LLM-as-judge reviewer scores change sets (live mode)', 'CI: compass/check-spec.mjs + tests on every PR'] },
];

const TREE = `your-repo/
├── AGENTS.md                 ← handover contract for any human or AI agent
├── CLAUDE.md                 ← points agents to AGENTS.md
├── compass/
│   ├── spec.json             ← source of truth: idea, REQ-xxx, TC-xxx, ADR-xxx
│   ├── idea.md · requirements.md · tests.md · decisions.md   (generated views)
│   ├── handover.md           ← where we are + next step per role
│   ├── guardrails.json       ← rules agents must obey
│   └── check-spec.mjs        ← CI traceability check
├── .github/
│   ├── workflows/compass-ci.yml      ← spec check + npm test + build on every PR
│   ├── workflows/compass-deploy.yml  ← GitHub Pages deploy on main
│   ├── pull_request_template.md      ← REQ/TC ids + role sign-off
│   └── ISSUE_TEMPLATE/requirement.md · bug.md
├── src/ · tests/             ← your code; tests use node:test (npm test)
└── index.html · package.json`;

export function ArchitecturePage() {
  return (
    <div className="stack gap-2xl">
      <PageHead over="How Compass works" title="Agent architecture" sub="Agent Harness → RAG → Tool calling → Evaluation & Guardrails, applied to a delivery pipeline that any role can continue." />
      <section className="arch">
        {LAYERS.map((l) => (
          <div key={l.n} className="layer">
            <span className={`chip ${l.cls}`} style={{ alignSelf: 'flex-start' }}><span className="dot" />Layer {l.n}</span>
            <div className="h3">{l.name}</div>
            <ul className="body-sm t-secondary" style={{ margin: 0, paddingLeft: 18 }}>{l.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </section>

      <section className="stack gap-md">
        <h2 className="h3">Agents</h2>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Agent</th><th>Stage</th><th>Mirrors</th><th>Tools</th><th>Output</th><th>Gate</th></tr></thead>
          <tbody>{AGENTS.map((a) => (
            <tr key={a.id}><td><strong>{a.name}</strong><div className="body-sm t-tertiary">{a.purpose}</div></td><td><span className={`chip ${STAGE_INFO[a.stage].cls}`}>{STAGE_INFO[a.stage].name}</span></td><td>{a.mirrors}</td>
              <td className="mono-sm">{a.tools.join(', ') || '—'}</td><td className="body-sm">{a.output}</td><td className="body-sm">{a.gate}</td></tr>
          ))}</tbody>
        </table></div>
      </section>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="card pad-xl stack gap-sm">
          <div className="row gap-sm"><h2 className="h3">Compass Framework</h2><Badge tone="brand">v{FRAMEWORK_VERSION}</Badge></div>
          <p className="body-sm t-secondary">Installed into every repo so the project can be handed over to anyone — with or without the portal.</p>
          <pre className="diff" style={{ maxHeight: 'none' }}>{TREE}</pre>
        </section>
        <section className="card pad-xl stack gap-sm">
          <h2 className="h3">Default guardrails</h2>
          <p className="body-sm t-secondary">Stored in <span className="code-inline">compass/guardrails.json</span> per repo.</p>
          <pre className="diff" style={{ maxHeight: 'none' }}>{JSON.stringify(DEFAULT_GUARDRAILS, null, 2)}</pre>
        </section>
      </div>
    </div>
  );
}
