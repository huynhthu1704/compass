export type Phase = 'discover' | 'define' | 'design' | 'build' | 'release' | 'monitor';
export const PHASES: Phase[] = ['discover', 'define', 'design', 'build', 'release', 'monitor'];

export type Role = 'BA' | 'PO' | 'DM' | 'Sponsor' | 'UX' | 'Dev' | 'QA' | 'Ops' | 'Data';
export type Lang = 'en' | 'vi';
export type Size = 'small' | 'medium' | 'large';

export interface Answers {
  affected?: string;      // who is affected
  pain?: string;          // current pain & evidence
  metric?: string;        // how success is measured
  constraints?: string;   // budget, deadline, regulation
  tried?: string;         // what has been tried
}

export interface Artefact {
  id: string;
  actionId: string;
  title: string;
  phase: Phase;
  content: string;        // markdown
  status: 'draft' | 'approved';
  createdAt: string;
  updatedAt: string;
  version: number;
  ai?: boolean;
}

export interface Story {
  id: string;
  key: string;            // US-1
  epic: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  ac: string[];           // Gherkin lines
  priority: 'Must' | 'Should' | 'Could' | "Won't";
  points: number;
  status: 'To do' | 'In progress' | 'Done';
  events: string[];       // tracking events
  feature: string;
}

export interface ChangeEntry {
  id: string;
  date: string;           // yyyy-mm-dd
  title: string;
  type: 'release' | 'change' | 'experiment' | 'rollback';
  rollout: number;        // %
  note?: string;
}

export interface MetricRow {
  date: string;
  exposed: number;
  tried: number;
  activated: number;
  retained: number;
}

export interface Project {
  id: string;
  name: string;
  intent: string;
  domain: string;
  productType: 'B2B' | 'B2C' | 'Internal';
  stage: 'Idea' | 'Existing product' | 'Live feature';
  size: Size;
  features: string[];
  answers: Answers;
  artefacts: Artefact[];
  stories: Story[];
  changelog: ChangeEntry[];
  metrics: MetricRow[];
  alertThreshold: number; // % WoW drop that triggers an alert
  skipped: string[];
  checklist: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  role?: Role;
  lang: Lang;
  theme: 'light' | 'dark';
  apiKey?: string;
  model: string;
}

export interface State {
  settings: Settings;
  projects: Project[];
}
