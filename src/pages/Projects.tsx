import { go } from '../App';
import { demoProject } from '../demo';
import { currentStage, stageStatus } from '../progress';
import { store, useStore } from '../store';
import { STAGES } from '../types';
import { ago, Badge, Button, PageHead, StageChip } from '../ui';

export function ProjectsPage() {
  const { projects, settings } = useStore();
  const openDemo = () => { const p = demoProject(); store.addProject(p); go(`/p/${p.id}`); };
  return (
    <div className="stack gap-xl">
      <PageHead
        over={settings.githubUser ? `GitHub · @${settings.githubUser}` : 'Demo mode — connect GitHub to manage real repos'}
        title="Projects"
        sub="Every project is a GitHub repository with the Compass Framework: idea → requirements → test cases → code (agent PRs) → release."
        right={<>
          <Button variant="secondary" onClick={openDemo}>Open demo project</Button>
          <Button variant="secondary" onClick={() => go('/import')} disabled={!settings.githubToken} title={settings.githubToken ? '' : 'Connect GitHub first'}>Import from GitHub</Button>
          <Button variant="accent" onClick={() => go('/new')}>+ New project</Button>
        </>}
      />
      {!projects.length ? (
        <div className="grid-3">
          <button className="action-card recommended" onClick={() => go('/new')} style={{ padding: 24 }}><Badge tone="accent">Start</Badge><div className="h3">New idea → new repo</div><div className="t-secondary">Describe the idea. Compass creates the GitHub repo with the framework, a starter site, CI and Pages deploy.</div></button>
          <button className="action-card" onClick={() => (settings.githubToken ? go('/import') : go('/connect'))} style={{ padding: 24 }}><Badge tone="brand">Existing</Badge><div className="h3">Import a GitHub repo</div><div className="t-secondary">Pick any of your repos. Compass indexes it for RAG and installs the framework through a pull request.</div></button>
          <button className="action-card" onClick={openDemo} style={{ padding: 24 }}><Badge>No keys needed</Badge><div className="h3">Explore the demo</div><div className="t-secondary">A sample project with requirements, tests, an agent PR and a release — all stages work in demo mode.</div></button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((p) => {
            const st = stageStatus(p), cur = currentStage(p);
            const waiting = p.runs.filter((r) => r.status === 'awaiting-approval').length;
            return (
              <button key={p.id} className="action-card" onClick={() => go(`/p/${p.id}`)}>
                <div className="row gap-sm wrap"><StageChip stage={cur} active />{p.demo && <Badge>demo</Badge>}{p.repo && <Badge tone="brand">{p.repo.private ? 'private' : 'public'} repo</Badge>}{waiting > 0 && <Badge tone="accent">{waiting} awaiting approval</Badge>}{p.dirty && <Badge tone="warning">spec not committed</Badge>}</div>
                <div className="h3">{p.name}</div>
                <div className="body-sm t-secondary">{p.spec.idea.intent || p.description || 'No idea yet'}</div>
                <div className="row gap-xs">{STAGES.map((s) => <span key={s} className="progress grow" style={{ height: 4 }}><span style={{ width: st[s].done ? '100%' : '0%' }} /></span>)}</div>
                <div className="mono-sm t-tertiary">{p.repo ? `${p.repo.owner}/${p.repo.name}` : 'local only'} · {p.spec.requirements.length} REQ · {p.spec.tests.length} TC · {p.releases[0]?.tag || 'no release'} · {ago(p.updatedAt)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
