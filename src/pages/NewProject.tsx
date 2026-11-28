import { useState } from 'react';
import { go } from '../App';
import { github, toRef } from '../github';
import { installFramework, slug, startRun } from '../harness';
import { emptyIdea, featureName } from '../spec';
import { newProject, now, store, useStore } from '../store';
import { Badge, Button, Field, PageHead, toast, useAction } from '../ui';
import { getSession } from '../firebase';

export function NewProjectPage() {
  const { settings } = useStore();
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [priv, setPriv] = useState(false);
  const [stack, setStack] = useState('Static web app (HTML/JS ES modules), node:test, GitHub Pages');
  const [onGitHub, setOnGitHub] = useState(!!settings.githubToken);
  const { busy, run } = useAction();
  const [log, setLog] = useState<string[]>([]);
  const repoName = slug(name) || 'my-project';

  const create = () => run(async () => {
    const add = (s: string) => setLog((l) => [...l, s]);
    let p = newProject({ name: name.trim() || 'My project', description: idea.trim().slice(0, 160) });
    p = { ...p, spec: { ...p.spec, stack, features: [{ id: 'F-001', name: featureName(idea), idea: { ...emptyIdea(), intent: idea.trim() }, createdAt: now() }] } };
    if (onGitHub && settings.githubToken) {
      add(`Creating repository ${settings.githubUser}/${repoName}…`);
      const r = await github.createRepo(settings.githubToken, repoName, p.description, priv);
      p = { ...p, repo: toRef(r) };
      store.addProject(p);
      // REQ-041/REQ-044 (phase 1): signed in, the setup runs with the shared work token, which cannot reach a new
      // repository until a super admin adds it on GitHub. So stop here and say what to do next (build 3 adds the
      // "Continue setup" step and switches Pages on with the creator token).
      const s = getSession();
      if (s.status === 'signed-in' && !s.demo) {
        const next = `Repository created. Next: add ${p.repo!.owner}/${p.repo!.name} to the work token on GitHub, then install the framework from the project's Overview (without the starter site for now) and switch GitHub Pages on in the repository's Settings → Pages.`;
        add(next); toast(next);
      } else {
        add('Installing Compass Framework + starter site + CI/deploy workflows…');
        await installFramework(p.id, { starter: true, direct: true });
        add('Enabling GitHub Pages (deploy from GitHub Actions)…');
        try { const pg = await github.enablePages(settings.githubToken, p.repo!); store.update(p.id, (x) => ({ ...x, repo: x.repo && { ...x.repo, pagesUrl: pg.html_url } })); }
        catch (e) { add(`Pages not enabled automatically (${(e as Error).message}) — enable it in repo Settings → Pages → Source: GitHub Actions.`); }
      }
    } else store.addProject(p);
    add('Ideation agent is shaping the idea…');
    startRun(p.id, 'ideation', idea.trim(), { featureId: 'F-001' });
    go(`/p/${p.id}/f/F-001/idea`);
  });

  return (
    <div className="stack gap-xl" style={{ maxWidth: 820 }}>
      <PageHead over="New project" title="What do you want to build?" sub="Start with the idea. Compass creates the repo, installs the framework and hands the idea to the Ideation agent." />
      <div className="card pad-xl stack gap-lg">
        <Field label="Project name"><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Travel Journal" /></Field>
        <Field label="First feature — idea / business outcome" help="Write it as an outcome if you can: who benefits and what changes. You can add more features later, in parallel.">
          <textarea className="textarea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Help travellers publish a shareable trip page in under 5 minutes, so more of them share within their first week" />
        </Field>
        <Field label="Tech stack" help="The coding agent follows this. The default needs no build step and deploys straight to GitHub Pages."><input className="input" value={stack} onChange={(e) => setStack(e.target.value)} /></Field>
        <div className="stack gap-sm">
          <label className="row gap-sm"><input type="checkbox" checked={onGitHub} disabled={!settings.githubToken} onChange={(e) => setOnGitHub(e.target.checked)} /><span>Create a GitHub repository <span className="mono">{settings.githubUser || 'you'}/{repoName}</span></span>{!settings.githubToken && <Badge tone="warning">connect GitHub first</Badge>}</label>
          {onGitHub && <label className="row gap-sm" style={{ paddingLeft: 24 }}><input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} /><span className="body-sm">Private repository (GitHub Pages on private repos needs a paid plan)</span></label>}
        </div>
      </div>
      {log.length > 0 && <div className="panel mono-sm stack gap-xs">{log.map((l, i) => <span key={i}>› {l}</span>)}</div>}
      <div className="row gap-sm">
        <Button variant="accent" disabled={busy || idea.trim().length < 10} onClick={create}>{busy ? 'Creating…' : onGitHub ? 'Create repo & start' : 'Create local project & start'}</Button>
        <Button variant="ghost" onClick={() => go('/')}>Cancel</Button>
      </div>
    </div>
  );
}
