import { useState } from 'react';
import { go } from '../App';
import { AgentBox } from '../components/AgentBox';
import { isDesignAdmin, mainLink, saveMainLink, TOOL_NAMES } from '../designLinks';
import { projectKey, useSession } from '../firebase';
import { featureOf } from '../spec';
import { now, store, useStore } from '../store';
import type { Design, DesignScreen, DesignTool, DesignToolKind, Project } from '../types';
import { Badge, Button, DESIGN_STATUS_TONE, Field, PageHead } from '../ui';

// The old one-link box stays until build 2 (REQ-081); Miro is set on Project settings, so it is not offered here.
const TOOLS = Object.fromEntries(Object.entries(TOOL_NAMES).filter(([k]) => k !== 'miro')) as Record<Exclude<DesignToolKind, 'miro'>, string>;

/** figma.com links can be embedded with Figma's official embed URL; other tools are opened in a new tab. */
const figmaEmbed = (url?: string) => (url && /^https:\/\/([\w-]+\.)?figma\.com\//.test(url) ? `https://www.figma.com/embed?embed_host=compass&url=${encodeURIComponent(url)}` : null);

export function DesignPage({ p, fid }: { p: Project; fid: string }) {
  const { settings } = useStore();
  const f = featureOf(p, fid);
  // REQ-080: only the project admin may change the design link here too (the old box stays until build 2, REQ-081).
  const session = useSession();
  const projectRoles = (p.repo && session.access.find((a) => a.id === projectKey(p.repo!))?.roles) || [];
  const admin = isDesignAdmin({ role: settings.role, signIn: session.status, superAdmin: session.superAdmin, projectRoles, demo: !!p.demo });
  const [editTool, setEditTool] = useState(!p.spec.designTool && admin);
  const [tool, setTool] = useState<DesignTool>(() => mainLink(p.spec.designTool));
  if (!f) return <div className="empty">Feature not found.</div>;
  const d = f.design;
  const reqs = p.spec.requirements.filter((r) => r.featureId === fid);
  const approvedReqs = reqs.filter((r) => r.status !== 'Draft');
  const drafts = reqs.filter((r) => r.status === 'Draft');
  const uncovered = d ? approvedReqs.filter((r) => !d.screens.some((s) => s.reqIds.includes(r.id))) : [];
  const setD = (patch: Partial<Design>) => store.spec(p.id, (s) => ({ ...s, features: s.features.map((x) => (x.id === fid && x.design ? { ...x, design: { ...x.design, ...patch } } : x)) }));
  const setS = (id: string, patch: Partial<DesignScreen>) => d && setD({ screens: d.screens.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const saveTool = () => { store.spec(p.id, (s) => { const { designTool: _old, ...rest } = s; const next = saveMainLink(s.designTool, tool.kind, tool.url); return next ? { ...rest, designTool: next } : rest; }); setEditTool(false); };
  const approve = () => setD({ status: 'Approved', approvedBy: settings.githubUser ? `@${settings.githubUser}` : settings.role || 'PO', approvedAt: now() });
  const embed = figmaEmbed(d?.url || p.spec.designTool?.url);

  return (
    <div className="stack gap-xl">
      <PageHead over={`${f.id} ${f.name} · Stage 3 · Design · owner: UX / PO`} title="Design" sub={`Screens traced to the approved requirements. Coding is locked until the design is approved. Saved to compass/spec.json and compass/design/${f.id}.md.`}
        right={d && d.status === 'Draft' ? <Button variant="accent" disabled={uncovered.length > 0} title={uncovered.length ? 'Every approved requirement needs a screen' : undefined} onClick={approve}>Approve design</Button>
          : d ? <Button variant="ghost" onClick={() => setD({ status: 'Draft', approvedBy: undefined, approvedAt: undefined })}>Reopen as draft</Button> : undefined} />

      <section className="card pad-xl stack gap-md">
        <div className="row gap-sm wrap">
          <h2 className="h4 grow">Project design tool</h2>
          {p.spec.designTool && !editTool && <><Badge tone="brand">{TOOL_NAMES[p.spec.designTool.kind]}</Badge><a className="btn ghost sm" href={p.spec.designTool.url} target="_blank" rel="noreferrer">Open ↗</a>{admin && <Button size="sm" variant="ghost" onClick={() => { setTool(mainLink(p.spec.designTool)); setEditTool(true); }}>Change</Button>}</>}
        </div>
        {editTool && admin ? (
          <div className="row gap-sm wrap end">
            <Field label="Tool"><select className="select" value={tool.kind} onChange={(e) => setTool({ ...tool, kind: e.target.value as DesignToolKind })}>{Object.entries(TOOLS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <div className="grow" style={{ minWidth: 240 }}><Field label="Project or file link" help="One design tool per project, e.g. https://www.figma.com/design/…"><input className="input" value={tool.url} placeholder="https://www.figma.com/design/…" onChange={(e) => setTool({ ...tool, url: e.target.value })} /></Field></div>
            <Button variant="secondary" onClick={saveTool}>Save</Button>
          </div>
        ) : !p.spec.designTool ? null : <div className="body-sm t-secondary mono-sm" style={{ wordBreak: 'break-all' }}>{p.spec.designTool.url}</div>}
      </section>

      <AgentBox p={p} agentId="designer" featureId={fid} reqIds={approvedReqs.map((r) => r.id)} cta={d ? 'Redesign' : 'Generate design'} defaultGoal={`Design the screens for ${approvedReqs.map((r) => r.id).join(', ')}`}
        disabled={!reqs.length ? 'Create requirements first.' : drafts.length ? `Approve every requirement first (${drafts.map((r) => r.id).join(', ')} still Draft).` : undefined}
        hint="Starts automatically when the last requirement is approved. Accepting the agent's proposal saves it here as a Draft; then draw it in the design tool, link the frames and approve." />

      {!d ? <div className="empty">No design yet.</div> : (
        <>
          <section className="card pad-xl stack gap-md">
            <div className="row gap-sm wrap">
              <h2 className="h4 grow">Design</h2>
              <Badge tone={DESIGN_STATUS_TONE[d.status]}>{d.status}</Badge>
              {d.approvedBy && <span className="body-sm t-tertiary">by {d.approvedBy} · {d.approvedAt?.slice(0, 10)}</span>}
            </div>
            {d.status === 'Approved' && <div className="body-sm">Coding is unlocked. <button className="btn ghost sm" onClick={() => go(`/p/${p.id}/f/${fid}/build`)}>Go to Build →</button></div>}
            {uncovered.length > 0 && <div className="body-sm t-accent">Not covered by any screen: {uncovered.map((r) => r.id).join(', ')}. Add them to a screen before approving.</div>}
            <Field label="Approach"><textarea className="textarea" style={{ minHeight: 60 }} value={d.summary} onChange={(e) => setD({ summary: e.target.value })} /></Field>
            <Field label={`This feature in ${p.spec.designTool ? TOOL_NAMES[p.spec.designTool.kind] : 'the design tool'}`} help="Link to the page or frame of this feature"><input className="input" value={d.url || ''} placeholder="https://www.figma.com/design/…?node-id=…" onChange={(e) => setD({ url: e.target.value || undefined })} /></Field>
            <Field label="Notes (accessibility, responsive, open questions)"><textarea className="textarea" style={{ minHeight: 60 }} value={d.notes || ''} onChange={(e) => setD({ notes: e.target.value })} /></Field>
          </section>

          {embed && <section className="card" style={{ padding: 0, overflow: 'hidden' }}><iframe title="Design preview" src={embed} style={{ width: '100%', height: 480, border: 0, display: 'block' }} allowFullScreen /></section>}

          <section className="stack gap-sm">
            <div className="row gap-sm"><h2 className="h3 grow">Screens</h2><Button size="sm" variant="ghost" onClick={() => setD({ screens: [...d.screens, { id: `SCR-${Math.max(0, ...d.screens.map((s) => +s.id.replace(/\D/g, '') || 0)) + 1}`, name: 'New screen', purpose: '', reqIds: [], elements: [], states: ['Empty', 'Error', 'Success'] }] })}>+ Screen</Button></div>
            {d.screens.map((s) => (
              <div key={s.id} className="card stack gap-sm">
                <div className="row gap-sm wrap">
                  <span className="mono t-brand">{s.id}</span>
                  <input className="input grow" style={{ fontWeight: 600, minWidth: 180 }} value={s.name} onChange={(e) => setS(s.id, { name: e.target.value })} aria-label="Screen name" />
                  {s.frameUrl && <a className="btn ghost sm" href={s.frameUrl} target="_blank" rel="noreferrer">Frame ↗</a>}
                  <Button size="sm" variant="danger" onClick={() => confirm(`Delete ${s.id}?`) && setD({ screens: d.screens.filter((x) => x.id !== s.id) })}>Delete</Button>
                </div>
                <div className="row gap-xs wrap">
                  {approvedReqs.map((r) => (
                    <label key={r.id} className={`badge tone-${s.reqIds.includes(r.id) ? 'info' : 'neutral'}`} style={{ cursor: 'pointer' }} title={r.title}>
                      <input type="checkbox" style={{ marginRight: 4 }} checked={s.reqIds.includes(r.id)} onChange={(e) => setS(s.id, { reqIds: e.target.checked ? [...s.reqIds, r.id] : s.reqIds.filter((x) => x !== r.id) })} />{r.id}
                    </label>
                  ))}
                </div>
                <Field label="Purpose"><input className="input" value={s.purpose} onChange={(e) => setS(s.id, { purpose: e.target.value })} /></Field>
                <div className="grid-2">
                  <Field label="Elements" help="One per line"><textarea className="textarea" style={{ minHeight: 80 }} value={s.elements.join('\n')} onChange={(e) => setS(s.id, { elements: e.target.value.split('\n') })} /></Field>
                  <Field label="States" help="One per line"><textarea className="textarea" style={{ minHeight: 80 }} value={s.states.join('\n')} onChange={(e) => setS(s.id, { states: e.target.value.split('\n') })} /></Field>
                </div>
                <Field label="Frame link"><input className="input" value={s.frameUrl || ''} placeholder="Link to this screen's frame" onChange={(e) => setS(s.id, { frameUrl: e.target.value || undefined })} /></Field>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
