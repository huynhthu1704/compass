import { go } from '../App';
import { demoProject } from '../demo';
import { featureStage } from '../progress';
import { useState } from 'react';
import { canSeeProject, loadProjectToken, projectTokenOf, useSession, type ProjectAccess } from '../firebase';
import { github } from '../github';
import { missingTokenMessage, pickToken, sharedToOpen } from '../team';
import { importRepo } from './Import';
import { store, useStore } from '../store';
import { ago, Badge, Button, PageHead, StageChip } from '../ui';

export function ProjectsPage() {
  const { projects: all, settings } = useStore();
  const session = useSession();
  const projects = all.filter((p) => canSeeProject(p, session)); // F-015 REQ-032: only projects whose team lists me
  // F-015: shared projects not on this device yet, opened from GitHub with the project's shared token (REQ-034).
  const shared = session.status === 'signed-in' ? sharedToOpen(session.access, all.map((p) => p.repo)) : [];
  const [opening, setOpening] = useState<string | null>(null);
  const [openErr, setOpenErr] = useState<string | null>(null);
  const openShared = async (a: ProjectAccess) => {
    setOpening(a.id); setOpenErr(null);
    try {
      await loadProjectToken(a.id).catch(() => undefined);
      const t = pickToken(settings.githubToken, projectTokenOf(a.id), true);
      if (!t) throw new Error(missingTokenMessage(true));
      const r = await github.getRepo(t, a.repo!.owner, a.repo!.name);
      const p = await importRepo(t, r, a.name || r.name);
      go(`/p/${p.id}`);
    } catch (e) { setOpenErr(`${a.name || a.id}: ${(e as Error).message}`); } finally { setOpening(null); }
  };
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
      {openErr && <p className="body-sm t-danger" role="alert">{openErr}</p>}
      {shared.length > 0 && (
        <section className="stack gap-md" aria-labelledby="shared-heading">
          <h2 id="shared-heading" className="h3">Shared with you</h2>
          <div className="grid-3">
            {shared.map((a) => (
              <div key={a.id} className="action-card" style={{ cursor: 'default' }}>
                <div className="row gap-xs wrap">{a.roles.map((r) => <Badge key={r} tone="brand">{r}</Badge>)}</div>
                <div className="h3">{a.name || a.id}</div>
                <div className="mono-sm t-tertiary">{a.repo!.owner}/{a.repo!.name} · not on this device yet</div>
                <div><Button variant="accent" size="sm" disabled={!!opening} aria-label={`Open ${a.name || a.id}`} onClick={() => void openShared(a)}>{opening === a.id ? 'Opening…' : 'Open'}</Button></div>
              </div>
            ))}
          </div>
        </section>
      )}
      {!projects.length && shared.length > 0 ? null : !projects.length ? (
        <div className="grid-3">
          <button className="action-card recommended" onClick={() => go('/new')} style={{ padding: 24 }}><Badge tone="accent">Start</Badge><div className="h3">New idea → new repo</div><div className="t-secondary">Describe the idea. Compass creates the GitHub repo with the framework, a starter site, CI and Pages deploy.</div></button>
          <button className="action-card" onClick={() => (settings.githubToken ? go('/import') : go('/connect'))} style={{ padding: 24 }}><Badge tone="brand">Existing</Badge><div className="h3">Import a GitHub repo</div><div className="t-secondary">Pick any of your repos. Compass indexes it for RAG and installs the framework through a pull request.</div></button>
          <button className="action-card" onClick={openDemo} style={{ padding: 24 }}><Badge>No keys needed</Badge><div className="h3">Explore the demo</div><div className="t-secondary">A sample project with requirements, tests, an agent PR and a release — all stages work in demo mode.</div></button>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((p) => {
            const feats = p.spec.features.filter((f) => !f.archived);
            const stages = feats.map((f) => featureStage(p, f.id));
            const waiting = p.runs.filter((r) => r.status === 'awaiting-approval').length;
            return (
              <button key={p.id} className="action-card" onClick={() => go(`/p/${p.id}`)}>
                <div className="row gap-sm wrap"><Badge tone="brand">{feats.length} feature{feats.length === 1 ? '' : 's'}</Badge>{p.demo && <Badge>demo</Badge>}{p.repo && <Badge tone="brand">{p.repo.private ? 'private' : 'public'} repo</Badge>}{waiting > 0 && <Badge tone="accent">{waiting} awaiting approval</Badge>}{p.dirty && <Badge tone="warning">spec not committed</Badge>}</div>
                <div className="h3">{p.name}</div>
                <div className="body-sm t-secondary">{p.description || feats[0]?.idea.intent || 'No features yet'}</div>
                <div className="row gap-xs wrap">{feats.slice(0, 6).map((f, i) => (stages[i] === 'done' ? <Badge key={f.id} tone="success">{f.id} released</Badge> : <StageChip key={f.id} stage={stages[i] as Exclude<typeof stages[number], 'done'>} />))}</div>
                <div className="mono-sm t-tertiary">{p.repo ? `${p.repo.owner}/${p.repo.name}` : 'local only'} · {p.spec.requirements.length} REQ · {p.spec.tests.length} TC · {p.releases[0]?.tag || 'no release'} · {ago(p.updatedAt)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
