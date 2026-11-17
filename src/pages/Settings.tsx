import { useState } from 'react';
import { ROLE_INFO } from '../catalog';
import { store, useStore } from '../store';
import type { Role } from '../types';
import { Button, Field, PageHead, toast } from '../ui';

export function SettingsPage() {
  const { settings, projects } = useStore();
  const [key, setKey] = useState(settings.apiKey || '');
  return (
    <div className="stack gap-xl" style={{ maxWidth: 760 }}>
      <PageHead title="Settings" />
      <section className="card pad-xl stack gap-lg">
        <h2 className="h3">Profile</h2>
        <Field label="Your role" help="Changes which actions are recommended first.">
          <select className="select" value={settings.role} onChange={(e) => store.setSettings({ role: e.target.value as Role })}>
            {Object.entries(ROLE_INFO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </Field>
        <div className="row gap-md wrap">
          <Field label="Language"><div className="seg"><button aria-pressed={settings.lang === 'en'} onClick={() => store.setSettings({ lang: 'en' })}>English</button><button aria-pressed={settings.lang === 'vi'} onClick={() => store.setSettings({ lang: 'vi' })}>Tiếng Việt</button></div></Field>
          <Field label="Theme"><div className="seg"><button aria-pressed={settings.theme === 'light'} onClick={() => store.setSettings({ theme: 'light' })}>Light</button><button aria-pressed={settings.theme === 'dark'} onClick={() => store.setSettings({ theme: 'dark' })}>Dark</button></div></Field>
        </div>
      </section>

      <section className="card pad-xl stack gap-lg">
        <div className="stack gap-xs">
          <h2 className="h3">AI generation (optional)</h2>
          <p className="body-sm t-secondary">Without a key, Compass fills BABOK-based templates with your project context. With your own Anthropic API key, "✦ Generate with Claude" writes project-specific artefacts and user stories. The key is stored only in this browser and sent only to api.anthropic.com.</p>
        </div>
        <Field label="Anthropic API key"><input className="input mono" type="password" value={key} placeholder="sk-ant-…" onChange={(e) => setKey(e.target.value)} /></Field>
        <Field label="Model"><input className="input mono" value={settings.model} onChange={(e) => store.setSettings({ model: e.target.value })} /></Field>
        <div className="row gap-sm">
          <Button onClick={() => { store.setSettings({ apiKey: key.trim() || undefined }); toast(key.trim() ? 'API key saved in this browser' : 'API key removed'); }}>Save</Button>
          {settings.apiKey && <Button variant="danger" onClick={() => { setKey(''); store.setSettings({ apiKey: undefined }); toast('API key removed'); }}>Remove key</Button>}
        </div>
      </section>

      <section className="card pad-xl stack gap-md">
        <h2 className="h3">Data</h2>
        <p className="body-sm t-secondary">{projects.length} project(s) stored locally in this browser. Use Projects → Export backup to move them to another device.</p>
        <div><Button variant="danger" onClick={() => { if (confirm('Delete ALL projects and settings in this browser?')) { localStorage.removeItem('compass.v1'); location.reload(); } }}>Reset Compass</Button></div>
      </section>

      <p className="body-sm t-tertiary">Compass v0.1 · Design system: <a href="https://www.figma.com/design/5e1GvRGmOSfiPS8HeoTkrr" target="_blank" rel="noreferrer">Figma</a></p>
    </div>
  );
}
