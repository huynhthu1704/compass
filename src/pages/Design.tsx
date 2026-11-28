import { useRef, useState } from 'react';
import { go } from '../App';
import { AgentBox } from '../components/AgentBox';
import { DesignFilesPanel } from '../components/DesignFilesPanel';
import { designFiles, designPreviews, isDesignAdmin } from '../designLinks';
import { projectKey, useSession } from '../firebase';
import { featureOf } from '../spec';
import { now, store, useStore } from '../store';
import { gateState, recordApproval, useUnconfirmed } from '../approvals';
import type { Design, DesignScreen, Project } from '../types';
import { Badge, Button, DESIGN_STATUS_TONE, Field, PageHead, toast } from '../ui';


export function DesignPage({ p, fid }: { p: Project; fid: string }) {
  const { settings } = useStore();
  const f = featureOf(p, fid);
  // REQ-081: the project's design files sit behind one button; only the admin gets the link to Project settings.
  const session = useSession();
  const projectRoles = (p.repo && session.access.find((a) => a.id === projectKey(p.repo!))?.roles) || [];
  const admin = isDesignAdmin({ role: settings.role, signIn: session.status, superAdmin: session.superAdmin, projectRoles, demo: !!session.demo || !!p.demo });
  const [approving, setApproving] = useState(false);
  const unconfirmed = useUnconfirmed(p); // REQ-038
  const [panel, setPanel] = useState(false);
  const [shown, setShown] = useState<'figma' | 'miro'>('figma');
  const filesBtns = useRef<(HTMLButtonElement | null)[]>([]);
  if (!f) return <div className="empty">Feature not found.</div>;
  const d = f.design;
  const reqs = p.spec.requirements.filter((r) => r.featureId === fid);
  const approvedReqs = reqs.filter((r) => r.status !== 'Draft');
  const drafts = reqs.filter((r) => r.status === 'Draft');
  const uncovered = d ? approvedReqs.filter((r) => !d.screens.some((s) => s.reqIds.includes(r.id))) : [];
  const setD = (patch: Partial<Design>) => store.spec(p.id, (s) => ({ ...s, features: s.features.map((x) => (x.id === fid && x.design ? { ...x, design: { ...x.design, ...patch } } : x)) }));
  const setS = (id: string, patch: Partial<DesignScreen>) => d && setD({ screens: d.screens.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  // F-015 REQ-033/036/037: UX or PO approve a design; the approval is recorded in Firebase first.
  const gate = gateState(p, 'design'); // not a hook: this page returns early above; App re-renders on session changes
  const approve = async () => {
    if (approving) return;
    setApproving(true);
    try {
      const by = await recordApproval(p, 'design', [fid]);
      setD({ status: 'Approved', approvedBy: by?.text || (settings.githubUser ? `@${settings.githubUser}` : settings.role || 'PO'), approvedAt: now() });
    } catch (e) { toast((e as Error).message); } finally { setApproving(false); }
  };
  const files = designFiles(p.spec.designTool);
  const count = [files.figma, files.other, files.miro].filter(Boolean).length;
  const previews = designPreviews(files, d?.url);
  const preview = previews.find((x) => x.kind === shown) || previews[0];
  // Focus goes back to the button once the panel is gone (the panel keeps focus inside itself while it is open).
  // Two placements (desktop corner, phone title row); only one is displayed, and focus goes back to that one.
  const closePanel = () => { setPanel(false); requestAnimationFrame(() => filesBtns.current.find((b) => b && b.offsetParent !== null)?.focus()); };
  const settingsPath = `/p/${p.id}/settings`;
  const filesButton = (where: 'desktop' | 'phone') => (
    <button ref={(el) => { filesBtns.current[where === 'desktop' ? 0 : 1] = el; }} className={`btn secondary files-btn-${where}`} aria-haspopup="dialog" aria-expanded={panel} onClick={() => setPanel(true)}>
      🔗 <span className="hide-phone">{count ? 'Design files' : 'Design files · none'}</span><span className="show-phone">{count ? 'Files' : 'Files · none'}</span>
      {count > 0 && <span className="files-count" aria-label={`${count} linked`}>{count}</span>}
    </button>
  );

  return (
    <div className="stack gap-xl">
      <PageHead over={`${f.id} ${f.name} · Stage 3 · Design · owner: UX / PO`} title="Design" sub={`Screens traced to the approved requirements. Coding is locked until the design is approved. Saved to compass/spec.json and compass/design/${f.id}.md.`}
        right={<>{d && d.status === 'Draft' ? <>{!gate.allowed && <span id="design-gate-hint" className="body-sm t-tertiary">{gate.hint}</span>}<Button variant="accent" disabled={uncovered.length > 0 || !gate.allowed || approving} title={uncovered.length ? 'Every approved requirement needs a screen' : undefined} aria-describedby={gate.allowed ? undefined : 'design-gate-hint'} onClick={() => void approve()}>Approve design</Button></>
          : d ? <Button variant="ghost" onClick={() => setD({ status: 'Draft', approvedBy: undefined, approvedAt: undefined })}>Reopen as draft</Button> : null}{filesButton('desktop')}</>} titleRight={filesButton('phone')} />
      {panel && <DesignFilesPanel files={files} admin={admin} settingsPath={settingsPath} featurePreview={!count && previews.length > 0} onClose={closePanel} />}

      <section className="stack gap-sm" aria-label="Design preview">
        {previews.length > 1 && (
          <div className="segmented" role="tablist" aria-label="Preview">
            {previews.map((x, i) => <button key={x.kind} id={`preview-tab-${x.kind}`} role="tab" aria-selected={preview?.kind === x.kind} aria-controls="design-preview" tabIndex={preview?.kind === x.kind ? 0 : -1}
              onClick={() => setShown(x.kind)}
              onKeyDown={(e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const next = previews[(i + (e.key === 'ArrowRight' ? 1 : previews.length - 1)) % previews.length]; setShown(next.kind); document.getElementById(`preview-tab-${next.kind}`)?.focus(); }}>{x.label}</button>)}
          </div>
        )}
        {preview
          ? <iframe key={preview.src} id="design-preview" role={previews.length > 1 ? 'tabpanel' : undefined} aria-labelledby={previews.length > 1 ? `preview-tab-${preview.kind}` : undefined} className="design-preview" title={preview.label} src={preview.src} allowFullScreen />
          : <div className="empty stack gap-sm" style={{ alignItems: 'center' }}>
              <span>{count ? 'No preview for this design tool. Open it from Design files.' : 'No design files linked yet'}</span>
              {!count && admin && <button className="btn ghost sm" onClick={() => go(settingsPath)}>Link them in Project settings →</button>}
            </div>}
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
              {unconfirmed.some((u) => u.item === fid && u.gate === 'design') && <Badge tone="danger" title="No Firebase record confirms this approval">Unconfirmed — claims {d.approvedBy || 'no approver'}</Badge>}
            </div>
            {d.status === 'Approved' && <div className="body-sm">Coding is unlocked. <button className="btn ghost sm" onClick={() => go(`/p/${p.id}/f/${fid}/build`)}>Go to Build →</button></div>}
            {uncovered.length > 0 && <div className="body-sm t-accent">Not covered by any screen: {uncovered.map((r) => r.id).join(', ')}. Add them to a screen before approving.</div>}
            <Field label="Approach"><textarea className="textarea" style={{ minHeight: 60 }} value={d.summary} onChange={(e) => setD({ summary: e.target.value })} /></Field>
            <Field label="This feature in the design tool" help="Link to the page or frame of this feature (a Figma link is previewed above)"><input className="input" value={d.url || ''} placeholder="https://www.figma.com/design/…?node-id=…" onChange={(e) => setD({ url: e.target.value || undefined })} /></Field>
            <Field label="Notes (accessibility, responsive, open questions)"><textarea className="textarea" style={{ minHeight: 60 }} value={d.notes || ''} onChange={(e) => setD({ notes: e.target.value })} /></Field>
          </section>

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
