import { AgentBox } from '../components/AgentBox';
import { featureOf } from '../spec';
import { store } from '../store';
import type { Idea, Project } from '../types';
import { Field, PageHead } from '../ui';

export function IdeaPage({ p, fid }: { p: Project; fid: string }) {
  const f = featureOf(p, fid);
  if (!f) return <div className="empty">Feature not found.</div>;
  const i = f.idea;
  const set = (patch: Partial<Idea>) => store.spec(p.id, (s) => ({ ...s, features: s.features.map((x) => (x.id === fid ? { ...x, idea: { ...x.idea, ...patch } } : x)) }));
  const listField = (label: string, k: 'users' | 'scopeIn' | 'scopeOut' | 'risks', help?: string) => (
    <Field label={label} help={help ?? 'One per line'}>
      <textarea className="textarea" style={{ minHeight: 88 }} value={i[k].join('\n')} onChange={(e) => set({ [k]: e.target.value.split('\n') } as Partial<Idea>)} onBlur={() => set({ [k]: i[k].map((x) => x.trim()).filter(Boolean) } as Partial<Idea>)} />
    </Field>
  );
  return (
    <div className="stack gap-xl">
      <PageHead over={`${f.id} ${f.name} · Stage 1 · Idea · owner: Product Owner`} title="Idea" sub={`An outcome-focused brief for this feature. Saved to compass/spec.json and compass/features/${f.id}.md.`} />
      <AgentBox p={p} agentId="ideation" featureId={fid} cta="Shape the idea" defaultGoal={i.intent} placeholder="Describe the idea in your own words — Vietnamese or English" hint="The agent restates solutions as measurable outcomes, finds users, scope and risks, and proposes a brief for your approval." />
      <section className="card pad-xl stack gap-lg">
        <Field label="Business intent (outcome)"><textarea className="textarea" style={{ minHeight: 64 }} value={i.intent} onChange={(e) => set({ intent: e.target.value })} /></Field>
        <Field label="Problem"><textarea className="textarea" style={{ minHeight: 64 }} value={i.problem} onChange={(e) => set({ problem: e.target.value })} /></Field>
        <div className="grid-2">
          {listField('Users', 'users')}
          <Field label="Outcome metric (baseline → target)"><textarea className="textarea" style={{ minHeight: 88 }} value={i.outcomeMetric} onChange={(e) => set({ outcomeMetric: e.target.value })} /></Field>
          {listField('In scope', 'scopeIn', 'One capability per line — the Requirements agent turns each into stories')}
          {listField('Out of scope', 'scopeOut')}
          {listField('Risks', 'risks')}
        </div>
      </section>
    </div>
  );
}
