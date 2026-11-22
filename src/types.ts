// ============ Compass AI Dev Portal — domain model ============

export type Role = 'PO' | 'BA' | 'DM' | 'UX' | 'Dev' | 'QA' | 'Ops';
export type Lang = 'en' | 'vi';

/** Pipeline stages a project moves through. Each stage is owned by an agent in the harness. */
export type Stage = 'idea' | 'requirements' | 'tests' | 'build' | 'release';
export const STAGES: Stage[] = ['idea', 'requirements', 'tests', 'build', 'release'];

export interface RepoRef {
  owner: string;
  name: string;
  defaultBranch: string;
  htmlUrl: string;
  private?: boolean;
  pagesUrl?: string;
}

export interface Idea {
  intent: string;          // business outcome
  problem: string;
  users: string[];
  outcomeMetric: string;
  scopeIn: string[];
  scopeOut: string[];
  risks: string[];
  stack: string;           // tech stack for the website
}

export interface Requirement {
  id: string;              // REQ-001
  title: string;
  story: string;           // As a … I want … so that …
  ac: string[];            // acceptance criteria (Given/When/Then)
  priority: 'Must' | 'Should' | 'Could';
  status: 'Draft' | 'Approved' | 'In build' | 'Done';
}

export interface TestCase {
  id: string;              // TC-001
  reqIds: string[];
  title: string;
  gherkin: string;
  type: 'Automated' | 'Manual';
  status: 'Not run' | 'Pass' | 'Fail';
}

export interface Spec {
  version: number;
  idea: Idea;
  requirements: Requirement[];
  tests: TestCase[];
  decisions: { id: string; title: string; decision: string; date: string }[];
}

export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  content: string;
  before?: string;
  reason?: string;
}

export type StepKind = 'plan' | 'retrieve' | 'tool_call' | 'tool_result' | 'model' | 'guardrail' | 'eval' | 'approval' | 'github' | 'error';

export interface TraceStep {
  t: string;               // ISO time
  kind: StepKind;
  title: string;
  detail?: string;
  ok?: boolean;
  tokens?: number;
}

export interface GuardrailResult { id: string; name: string; level: 'block' | 'warn' | 'pass'; message: string }
export interface EvalResult { id: string; name: string; score: number; max: number; note: string }

export type AgentId = 'ideation' | 'requirements' | 'testdesign' | 'coder' | 'reviewer' | 'release';

export interface Run {
  id: string;
  agent: AgentId;
  stage: Stage;
  goal: string;
  status: 'running' | 'awaiting-approval' | 'approved' | 'rejected' | 'failed' | 'done';
  mode: 'live' | 'demo';
  startedAt: string;
  finishedAt?: string;
  steps: TraceStep[];
  changes: FileChange[];
  guardrails: GuardrailResult[];
  evals: EvalResult[];
  output?: string;          // markdown summary
  proposal?: { idea?: Partial<Idea>; requirements?: Requirement[]; tests?: TestCase[] };
  branch?: string;
  prNumber?: number;
  prUrl?: string;
  reqIds?: string[];
}

export interface ReleaseRec { tag: string; name: string; url: string; date: string; prs: number[] }

export interface Project {
  id: string;
  name: string;
  description: string;
  repo: RepoRef | null;     // null = local/demo project not yet on GitHub
  frameworkInstalled: boolean;
  spec: Spec;
  specSha?: string;         // sha of compass/spec.json on GitHub
  dirty: boolean;           // local spec changes not committed
  runs: Run[];
  releases: ReleaseRec[];
  demo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  role?: Role;
  lang: Lang;
  theme: 'light' | 'dark';
  githubToken?: string;
  githubUser?: string;
  apiKey?: string;
  model: string;
  requireApproval: boolean;   // human-in-the-loop gate before any GitHub write
  autoSync: boolean;          // auto-commit spec changes to GitHub
}

export interface State {
  settings: Settings;
  projects: Project[];
}
