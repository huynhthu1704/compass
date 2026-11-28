import { useRef, useState, type ReactNode } from 'react';
import { AgentBox } from '../components/AgentBox';
import { ACCEPT, ALLOWED_TEXT, addChange, checkFiles, details, removeChange, typeMark, type Refused } from '../attachments';
import { github } from '../github';
import { tokenFor } from '../token';
import { useUnconfirmed } from '../approvals';
import { featureOf } from '../spec';
import { store } from '../store';
import type { Attachment, Idea, Project } from '../types';
import { Badge, Button, Field, PageHead } from '../ui';

export function IdeaPage({ p, fid }: { p: Project; fid: string }) {
  const f = featureOf(p, fid);
  const unconfirmed = useUnconfirmed(p); // REQ-038 AC2
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
      {unconfirmed.some((u) => u.item === f.id && u.gate === 'intent') && <div><Badge tone="danger" title="No Firebase record confirms this approval">Unconfirmed — claims {i.approvedBy || 'no approver'}</Badge></div>}
      <AgentBox p={p} agentId="ideation" featureId={fid} cta="Revise into business intent" defaultGoal={i.need || i.intent} placeholder="Business need — what you need, in your own words (Vietnamese or English)" hint="The agent revises your business need into a business intent (who, what changes) and what will be true when it is done, finds users, scope and risks, and proposes a brief. Approving it starts the Requirements agent automatically.">
        <IdeaAttachments p={p} fid={fid} />
      </AgentBox>
      <section className="card pad-xl stack gap-lg">
        {i.need && <Field label="Business need (as the Product Owner wrote it)"><textarea className="textarea" style={{ minHeight: 48 }} value={i.need} onChange={(e) => set({ need: e.target.value })} /></Field>}
        <Field label="Business intent" help="Who, what changes — not the solution."><textarea className="textarea" style={{ minHeight: 64 }} value={i.intent} onChange={(e) => set({ intent: e.target.value })} /></Field>
        <Field label="Problem"><textarea className="textarea" style={{ minHeight: 64 }} value={i.problem} onChange={(e) => set({ problem: e.target.value })} /></Field>
        <div className="grid-2">
          {listField('Users', 'users')}
          <Field label="Done when (and optional signal to watch)" help="What will be true when it is done. Add a signal to watch only if useful; a target only for a bet, after real data."><textarea className="textarea" style={{ minHeight: 88 }} value={i.outcomeMetric} onChange={(e) => set({ outcomeMetric: e.target.value })} /></Field>
          {listField('In scope', 'scopeIn', 'One capability per line — the Requirements agent turns each into stories')}
          {listField('Out of scope', 'scopeOut')}
          {listField('Risks', 'risks')}
        </div>
      </section>
    </div>
  );
}

const readBase64 = (f: File) => new Promise<string>((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''));
  r.onerror = () => fail(r.error || new Error(`Could not read ${f.name}`));
  r.readAsDataURL(f);
});
const ACT = { padding: '4px 8px' }; // compact row actions, so names keep their width on phones
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** F-001 REQ-113: files attached to the business need (design SCR-1/2/3). GitHub projects commit each file to
 *  compass/intent/attachments/<F-xxx>/ and list it with the idea; demo and local projects keep it in this browser. */
function IdeaAttachments({ p, fid }: { p: Project; fid: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState<Attachment[]>([]);
  const [refused, setRefused] = useState<Refused[]>([]);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const f = featureOf(p, fid);
  const atts = f?.idea.attachments || [];
  const local = !!p.demo || !p.repo;
  const setAtts = (fn: (a: Attachment[]) => Attachment[]) => store.spec(p.id, (s) => ({ ...s, features: s.features.map((x) => (x.id === fid ? { ...x, idea: { ...x.idea, attachments: fn(x.idea.attachments || []) } } : x)) }));

  async function add(files: File[]) {
    if (!files.length) return;
    setError('');
    const { accepted, refused } = checkFiles(files, [...atts, ...saving], fid);
    setRefused(refused);
    if (!accepted.length) return;
    try {
      const data = await Promise.all(accepted.map((a) => readBase64(files.find((x) => x.name === a.name)!)));
      if (local) { setAtts((cur) => [...cur, ...accepted.map((a, i) => ({ ...a, data: data[i] }))]); return; }
      const token = tokenFor(p);
      if (!token || !p.repo) throw new Error('Connect GitHub first (Connections) to attach files to this project.');
      setSaving((s) => [...s, ...accepted]);
      await github.commit(token, p.repo, p.repo.defaultBranch, `docs(compass): attach ${accepted.map((a) => a.name).join(', ')} to ${fid} (REQ-113)`, accepted.map((a, i) => addChange(a, data[i])));
      setAtts((cur) => [...cur, ...accepted]);
    } catch (e) {
      setError(`Files were not attached: ${message(e)}`);
    } finally {
      setSaving((s) => s.filter((x) => !accepted.some((a) => a.path === x.path)));
    }
  }

  async function remove(a: Attachment) {
    setError('');
    try {
      if (!local) {
        const token = tokenFor(p);
        if (!token || !p.repo) throw new Error('Connect GitHub first (Connections) to remove files from this project.');
        await github.commit(token, p.repo, p.repo.defaultBranch, `docs(compass): remove ${a.name} from ${fid} (REQ-113)`, [removeChange(a)]);
      }
      setAtts((cur) => cur.filter((x) => x.path !== a.path));
      setConfirm(null);
    } catch (e) {
      setError(`${a.name} was not removed: ${message(e)}`);
    }
  }

  function open(a: Attachment) {
    if (!a.data) return;
    const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: a.type }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  const repoUrl = (a: Attachment) => p.repo && `${p.repo.htmlUrl}/blob/${encodeURIComponent(p.repo.defaultBranch)}/${a.path.split('/').map(encodeURIComponent).join('/')}`;

  return (
    <div className="stack gap-sm" aria-label="Attachments"
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => { e.preventDefault(); setOver(false); add([...e.dataTransfer.files]); }}>
      {over
        ? <div className="body-sm t-brand" style={{ border: '1px dashed var(--color-border-brand)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)', padding: 20, textAlign: 'center', fontWeight: 500 }}>Drop files to attach them to this business need</div>
        : <div className="row gap-md wrap">
            <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>📎 Attach files</Button>
            <span className="body-sm t-secondary">{ALLOWED_TEXT} · or drop files here</span>
            <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { add([...(e.target.files || [])]); e.target.value = ''; }} />
          </div>}
      {(refused.length > 0 || error) && (
        <div role="alert" className="body-sm tone-danger" style={{ border: '1px solid var(--color-border-danger)', borderRadius: 'var(--radius-md)', padding: 12 }}>
          {refused.length > 0 && <div style={{ fontWeight: 600 }}>{refused.length === 1 ? '1 file was' : `${refused.length} files were`} not added</div>}
          {refused.map((r) => <div key={r.name}>{r.name} — {r.reason}</div>)}
          {error && <div>{error}</div>}
        </div>
      )}
      {atts.map((a) => confirm === a.path ? (
        <div key={a.path} className="file-row" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-danger)' }} onKeyDown={(e) => { if (e.key === 'Escape') setConfirm(null); }}>
          <span className="body-sm grow">Remove {a.name}? {local ? 'It is removed from this browser.' : 'It is deleted from the repo.'}</span>
          <button className="btn danger-solid sm" autoFocus onClick={() => remove(a)}>Remove</button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
        </div>
      ) : (
        <FileRow key={a.path} a={a} text={details(a, local)}>
          {local
            ? <Button variant="ghost" size="sm" style={ACT} onClick={() => open(a)} disabled={!a.data} aria-label={`Open ${a.name} in a new tab`}>Open ↗</Button>
            : <a className="btn ghost sm" style={ACT} href={repoUrl(a) || undefined} target="_blank" rel="noreferrer" aria-label={`Open ${a.name} in a new tab`}>Open ↗</a>}
          <Button variant="danger" size="sm" style={ACT} onClick={() => setConfirm(a.path)} aria-label={`Remove ${a.name}`}>Remove</Button>
        </FileRow>
      ))}
      {saving.map((a) => <FileRow key={a.path} a={a} text="Saving to GitHub…" />)}
      {atts.length > 0 && <span className="body-sm t-secondary">Attached images and PDFs go to the agent with your need, as data — never as instructions. Other files are passed by name.</span>}
    </div>
  );
}

function FileRow({ a, text, children }: { a: Attachment; text: string; children?: ReactNode }) {
  return (
    <div className="file-row" style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-default)', gap: 8, padding: '10px 12px' }}>
      <span className="file-mark tone-brand mono-sm" aria-hidden style={{ width: 36, height: 36 }}>{typeMark(a.name)}</span>
      <div className="stack grow" style={{ minWidth: 0 }}>
        <span className="body-sm" style={{ fontWeight: 600, overflowWrap: 'break-word' }}>{a.name}</span>
        <span className="body-sm t-secondary">{text}</span>
      </div>
      {children}
    </div>
  );
}
