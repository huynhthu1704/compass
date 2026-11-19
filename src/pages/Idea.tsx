import { AgentBox } from '../components/AgentBox';
import { store } from '../store';
import type { Idea, Project } from '../types';
import { Field, PageHead } from '../ui';

export function IdeaPage({ p }: { p: Project }) {
  const i = p.spec.idea;
  const set = (patch: Partial<Idea>) => store.spec(p.id, (s) => ({ ...s, idea: { ...s.idea, ...patch } }));
  const listField = (label: string, k: 'users' | 'scopeIn' | 'scopeOut' | 'risks', help?: string) => (
    <Field label={label} help={help ?? 'One per line'}>
      <textarea className="textarea" style={{ minHeight: 88 }} value={i[k].join('\n')} onChange={(e) => set({ [k]: e.target.value.split('\n') } as Partial<Idea>)} onBlur={() => set({ [k]: i[k].map((x) => x.trim()).filter(Boolean) } as Partial<Idea>)} />
    </Field>
  );
  return (
    <div className="stack gap-xl">
      <PageHead over="Stage 1 · Idea · owner: Product Owner" title="Idea" sub="An outcome-focused brief everyone agrees on. Saved to compass/spec.json → idea and compass/idea.md." />
      <AgentBox p={p} agentId="ideation" cta="Shape the idea" defaultGoal={i.intent || p.description} placeholder="Describe the idea in your own words — Vietnamese or English" hint="The agent restates solutions as measurable outcomes, finds users, scope and risks, and proposes a brief for your approval." />
      <section className="card pad-xl stack gap-lg">
        <Field label="Business intent (outcome)"><textarea className="textarea" style={{ minHeight: 64 }} value={i.intent} onChange={(e) => set({ intent: e.target.value })} /></Field>
        <Field label="Problem"><textarea className="textarea" style={{ minHeight: 64 }} value={i.problem} onChange={(e) => set({ problem: e.target.value })} /></Field>
        <div className="grid-2">
          {listField('Users', 'users')}
          <Field label="Outcome metric (baseline → target)"><textarea className="textarea" style={{ minHeight: 88 }} value={i.outcomeMetric} onChange={(e) => set({ outcomeMetric: e.target.value })} /></Field>
          {listField('In scope', 'scopeIn', 'One capability per line — the Requirements agent turns each into stories')}
          {listField('Out of scope', 'scopeOut')}
          {listField('Risks', 'risks')}
          <Field label="Tech stack"><textarea className="textarea" style={{ minHeight: 88 }} value={i.stack} onChange={(e) => set({ stack: e.target.value })} /></Field>
        </div>
      </section>
    </div>
  );
}
