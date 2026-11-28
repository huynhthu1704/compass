import { useState } from 'react';
import { go, query } from '../App';
import { refreshWorkspace, saveWorkspace, useSession, useWorkspace } from '../firebase';
import { github } from '../github';
import { store, useStore } from '../store';
import { Badge, Button, Field, PageHead, useAction } from '../ui';

/** REQ-041 AC4: what the shared work token needs. Compass cannot check from outside that Administration is off. */
const WORK_TOKEN_HELP = <>Fine-grained token, <strong>only the Compass project repositories</strong> → Permissions: <strong>Contents, Pull requests, Issues, Workflows, Pages: Read & write</strong>, <strong>Actions: Read</strong>. <strong>Never tick Administration</strong>: Compass cannot check this from outside. Set an expiry date. Every team member's browser can read this token.</>;

export function ConnectPage() {
  const session = useSession();
  // REQ-041, SCR-11: with sign-in on (outside the demo), only super admins reach this page, and it sets the shared values.
  if (session.status === 'signed-in' && !session.demo) return <SharedConnections />;
  return <DeviceConnections />;
}

/** SCR-11: the shared work token, account for new projects, Anthropic key and settings (ADR-016, ADR-017), and the
 *  super admin's own creator token, which stays on this device (REQ-044 AC2). */
function SharedConnections() {
  const ws = useWorkspace();
  const own = store.raw().settings;
  const [work, setWork] = useState('');
  const [account, setAccount] = useState<string | undefined>(undefined);
  const [creator, setCreator] = useState(own.githubToken || '');
  const [key, setKey] = useState('');
  const [model, setModel] = useState<string | undefined>(undefined);
  const [autoSync, setAutoSync] = useState<boolean | undefined>(undefined);
  const { busy, run } = useAction();
  const shown = { account: account ?? ws?.newProjectsAccount ?? '', model: model ?? ws?.model ?? 'claude-sonnet-5-5', autoSync: autoSync ?? ws?.autoSync ?? true };

  const save = () => run(async () => {
    const notes: string[] = [];
    if (work.trim()) notes.push(`work token works as @${(await github.me(work.trim())).login}`);
    let creatorUser: string | undefined;
    if (creator.trim() && creator.trim() !== own.githubToken) creatorUser = (await github.me(creator.trim())).login;
    await saveWorkspace({
      ...(work.trim() ? { workToken: work.trim() } : {}),
      ...(key.trim() ? { anthropicKey: key.trim() } : {}),
      newProjectsAccount: shown.account.trim(), model: shown.model.trim() || 'claude-sonnet-5-5', autoSync: shown.autoSync,
    });
    if (creator.trim() !== (own.githubToken || '')) store.setSettings({ githubToken: creator.trim() || undefined, githubUser: creator.trim() ? creatorUser : undefined });
    setWork(''); setKey('');
    await refreshWorkspace();
    return `Saved for everyone on your teams${notes.length ? ` (${notes.join('; ')})` : ''}.`;
  });
  const remove = (field: 'workToken' | 'anthropicKey', label: string) => run(async () => { await saveWorkspace({ [field]: '' }); await refreshWorkspace(); return `${label} removed for everyone.`; });

  return (
    <div className="stack gap-xl" style={{ maxWidth: 860 }}>
      <PageHead over="Workspace · Connections" title="Connections" sub="Only super admins see this page. The work token, the Anthropic key and the model and sync settings saved here are used by everyone on your teams." />

      <section className="card pad-xl stack gap-md">
        <div className="row gap-sm"><h2 className="h3">GitHub</h2>{ws?.workToken ? <Badge tone="success">work token set</Badge> : <Badge tone="warning">no work token</Badge>}</div>
        <Field label="Work token — shared with everyone on your teams" help={WORK_TOKEN_HELP}>
          <input className="input mono" type="password" value={work} placeholder={ws?.workToken ? '•••••••• saved — paste a new one to replace it' : 'github_pat_…'} onChange={(e) => setWork(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="GitHub account for new projects" help="New projects are created, and imports offered, only in this account (it must be one the work token can reach).">
          <input className="input mono" value={shown.account} placeholder="e.g. huynhthu1704" onChange={(e) => setAccount(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Creator token — this device only" help={<>Used only by you to create or import repositories and to switch GitHub Pages on: <strong>all repositories, Administration: Read & write</strong>. It stays in this browser and is never shared or saved to Firebase.</>}>
          <input className="input mono" type="password" value={creator} placeholder="github_pat_…" onChange={(e) => setCreator(e.target.value)} autoComplete="off" />
        </Field>
        {ws?.workToken && <div><Button size="sm" variant="danger" disabled={busy} onClick={() => remove('workToken', 'Work token')}>Remove the work token</Button></div>}
      </section>

      <section className="card pad-xl stack gap-md">
        <div className="row gap-sm"><h2 className="h3">Anthropic (agents)</h2><Badge tone="success">Used by everyone on your teams</Badge>{!ws?.anthropicKey && <Badge tone="warning">no key — demo agents</Badge>}</div>
        <Field label="API key" help="Live agent runs for every team member use this key. Without it, agents run in demo mode. Give it its own spending limit in the Anthropic console.">
          <input className="input mono" type="password" value={key} placeholder={ws?.anthropicKey ? '•••••••• saved — paste a new one to replace it' : 'sk-ant-…'} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Model (for everyone)"><input className="input mono" value={shown.model} onChange={(e) => setModel(e.target.value)} /></Field>
        {ws?.anthropicKey && <div><Button size="sm" variant="danger" disabled={busy} onClick={() => remove('anthropicKey', 'Anthropic key')}>Remove the key</Button></div>}
      </section>

      <section className="card pad-xl stack gap-md">
        <h2 className="h3">Sync & human-in-the-loop (for everyone)</h2>
        <label className="row gap-sm"><input type="checkbox" checked={shown.autoSync} onChange={(e) => setAutoSync(e.target.checked)} /> <span className="body-sm">Auto-sync: commit idea, requirement and test-case changes to GitHub automatically (a few seconds after someone stops editing).</span></label>
        <label className="row gap-sm"><input type="checkbox" checked disabled /> <span className="body-sm">Every agent output and every GitHub write requires human approval (always on — this is a guardrail, not a preference).</span></label>
      </section>

      <div className="card stack gap-xs" role="note" style={{ padding: '12px 16px', background: 'var(--color-bg-brand-subtle)' }}>
        <strong className="body-sm">Every team member's browser can read the work token and the key</strong>
        <span className="body-sm t-secondary">Keep the work token limited to the Compass repositories with an expiry date, give the key its own spending limit, and replace both when someone leaves.</span>
      </div>

      <div className="row gap-sm"><Button variant="accent" disabled={busy} onClick={save}>{busy ? 'Checking…' : 'Save & test'}</Button></div>
    </div>
  );
}

/** With sign-in off, or in the demo: keys stay on this device, as before (REQ-041 AC7). */
function DeviceConnections() {
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
        <Field label="Fine-grained personal access token" help={<>Create one at <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">github.com/settings/personal-access-tokens</a> → Repository access: <em>All repositories</em> (or selected) → Permissions: <strong>Contents, Pull requests, Issues, Workflows, Actions, Pages: Read & write</strong>, <strong>Administration: Read & write</strong> (only to create repos). Set an expiry date.</>}>
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
