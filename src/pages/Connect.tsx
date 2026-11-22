import { useState } from 'react';
import { go, query } from '../App';
import { github } from '../github';
import { store, useStore } from '../store';
import { Badge, Button, Field, PageHead, useAction } from '../ui';

export function ConnectPage() {
  const { settings } = useStore();
  const [gh, setGh] = useState(settings.githubToken || '');
  const [key, setKey] = useState(settings.apiKey || '');
  const [model, setModel] = useState(settings.model);
  const { busy, run } = useAction();
  const welcome = query().get('welcome');

  const save = () => run(async () => {
    let user: string | undefined;
    if (gh.trim()) user = (await github.me(gh.trim())).login;
    store.setSettings({ githubToken: gh.trim() || undefined, githubUser: user, apiKey: key.trim() || undefined, model: model.trim() || 'claude-sonnet-5-5' });
    return user ? `Connected to GitHub as @${user}` : 'Saved. Running in demo mode for GitHub.';
  });

  return (
    <div className="stack gap-xl" style={{ maxWidth: 860 }}>
      <PageHead over="Connections" title={welcome ? 'Connect your tools' : 'Connections'} sub="Compass runs entirely in your browser. Keys are stored only on this device and sent only to api.github.com and api.anthropic.com." />

      <section className="card pad-xl stack gap-md">
        <div className="row gap-sm"><h2 className="h3">GitHub</h2>{settings.githubUser ? <Badge tone="success">@{settings.githubUser}</Badge> : <Badge tone="warning">not connected</Badge>}</div>
        <Field label="Fine-grained personal access token" help={<>Create one at <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">github.com/settings/personal-access-tokens</a> → Repository access: <em>All repositories</em> (or selected) → Permissions: <strong>Contents, Pull requests, Workflows, Actions, Pages: Read & write</strong>, <strong>Administration: Read & write</strong> (only to create repos). Set an expiry date.</>}>
          <input className="input mono" type="password" value={gh} placeholder="github_pat_…" onChange={(e) => setGh(e.target.value)} autoComplete="off" />
        </Field>
      </section>

      <section className="card pad-xl stack gap-md">
        <div className="row gap-sm"><h2 className="h3">Anthropic (agents)</h2>{settings.apiKey ? <Badge tone="success">live agents</Badge> : <Badge tone="warning">demo agents</Badge>}</div>
        <Field label="API key" help="Without a key, every agent runs in demo mode: same harness, trace, guardrails and evals, with template outputs.">
          <input className="input mono" type="password" value={key} placeholder="sk-ant-…" onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Model"><input className="input mono" value={model} onChange={(e) => setModel(e.target.value)} /></Field>
      </section>

      <section className="card pad-xl stack gap-md">
        <h2 className="h3">Sync & human-in-the-loop</h2>
        <label className="row gap-sm"><input type="checkbox" checked={settings.autoSync} onChange={(e) => store.setSettings({ autoSync: e.target.checked })} /> <span className="body-sm">Auto-sync: commit idea, requirement and test-case changes to GitHub automatically (a few seconds after you stop editing).</span></label>
        <label className="row gap-sm"><input type="checkbox" checked={settings.requireApproval} disabled /> <span className="body-sm">Every agent output and every GitHub write requires human approval (always on — this is a guardrail, not a preference).</span></label>
      </section>

      <div className="row gap-sm">
        <Button variant="accent" disabled={busy} onClick={save}>{busy ? 'Checking…' : 'Save & test'}</Button>
        {settings.githubToken && <Button variant="danger" onClick={() => { setGh(''); store.setSettings({ githubToken: undefined, githubUser: undefined }); }}>Disconnect GitHub</Button>}
        {welcome && <Button variant="ghost" onClick={() => go('/')}>Skip — explore in demo mode</Button>}
      </div>
    </div>
  );
}
