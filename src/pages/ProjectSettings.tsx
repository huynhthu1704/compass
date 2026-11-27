// F-003 Project settings (REQ-080, REQ-082, ADR-015) — design: compass/design/2026-11-27-project-design-files.md (SCR-1, SCR-2, SCR-2b).
import { useState } from 'react';
import { checkDesignInput, designFiles, FIGMA_HELP, isDesignAdmin, MIRO_HELP, saveDesignFiles, TOOL_NAMES } from '../designLinks';
import { projectKey, useSession } from '../firebase';
import { store, useStore } from '../store';
import type { DesignToolKind, Project } from '../types';
import { Badge, Button, Field, PageHead, toast } from '../ui';

const MARK: Record<DesignToolKind, string> = { figma: 'F', miro: 'M', penpot: 'P', sketch: 'S', other: '↗' };

/** One linked file: tool mark, name, link and Open ↗ (new tab). */
function FileRow({ kind, url }: { kind: DesignToolKind; url: string }) {
  const name = kind === 'figma' ? 'Figma file' : kind === 'miro' ? 'Miro board' : `${TOOL_NAMES[kind]} link`;
  return (
    <div className="row gap-md" style={{ background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', alignItems: 'center' }}>
      <span className={`badge tone-${kind === 'miro' ? 'warning' : 'info'}`} aria-hidden style={{ width: 32, height: 32, justifyContent: 'center', fontWeight: 600 }}>{MARK[kind]}</span>
      <div className="stack grow" style={{ minWidth: 0 }}>
        <span className="body-sm" style={{ fontWeight: 600 }}>{name}</span>
        <span className="mono-sm t-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
      </div>
      <a className="btn ghost sm" href={url} target="_blank" rel="noreferrer" aria-label={`Open the ${name} in a new tab`}>Open ↗</a>
    </div>
  );
}

export function ProjectSettingsPage({ p }: { p: Project }) {
  const { settings } = useStore();
  const session = useSession();
  const projectRoles = (p.repo && session.access.find((a) => a.id === projectKey(p.repo!))?.roles) || [];
  const admin = isDesignAdmin({ role: settings.role, signIn: session.status, superAdmin: session.superAdmin, projectRoles, demo: !!p.demo });
  const files = designFiles(p.spec.designTool);
  const empty = !files.figma && !files.miro && !files.other;
  const [editing, setEditing] = useState(empty);
  const [figma, setFigma] = useState(files.figma || '');
  const [miro, setMiro] = useState(files.miro || '');
  const [errors, setErrors] = useState<{ figma?: string; miro?: string }>({});

  const start = () => { setFigma(files.figma || ''); setMiro(files.miro || ''); setErrors({}); setEditing(true); };
  const save = () => {
    const e = checkDesignInput(p.spec.designTool, { figma, miro });
    setErrors(e);
    if (e.figma || e.miro) return; // nothing is saved while a link is wrong
    const cleared = !saveDesignFiles(p.spec.designTool, { figma, miro });
    store.spec(p.id, (s) => {
      const next = saveDesignFiles(s.designTool, { figma, miro });
      const { designTool: _old, ...rest } = s;
      return next ? { ...rest, designTool: next } : rest;
    });
    setEditing(cleared); // SCR-2b: with no link left, the admin sees the empty fields again
    toast('Design files saved');
  };

  return (
    <div className="stack gap-xl">
      <PageHead over={`${p.name} · Project settings`} title="Project settings" sub="Settings that apply to the whole project. Saved to compass/spec.json." />

      <section className="card pad-xl stack gap-md" aria-labelledby="design-files-title">
        <div className="row gap-sm wrap">
          <h2 className="h4 grow" id="design-files-title">Design files</h2>
          {admin && <Badge tone="brand">compass/spec.json → designTool</Badge>}
          {admin && !editing && <Button size="sm" variant="ghost" onClick={start}>Change</Button>}
        </div>

        {admin && editing ? (
          <>
            <p className="body-sm t-secondary">The project's Figma file and Miro board. Every feature's Design page shows them, and the design agent works from them. Both are optional.</p>
            <div className="row gap-lg wrap start">
              <div style={{ flex: '1 1 240px', minWidth: 0 }}><Field label="Figma file" help={files.other ? `${FIGMA_HELP}. Saving one replaces the ${TOOL_NAMES[files.other.kind]} link.` : FIGMA_HELP} error={errors.figma}>
                <input className="input mono-sm" value={figma} placeholder="https://www.figma.com/design/…" aria-invalid={!!errors.figma} style={errors.figma ? { borderColor: 'var(--color-border-danger)' } : undefined} onChange={(e) => setFigma(e.target.value)} />
              </Field></div>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}><Field label="Miro board" help={MIRO_HELP} error={errors.miro}>
                <input className="input mono-sm" value={miro} placeholder="https://miro.com/app/board/…" aria-invalid={!!errors.miro} style={errors.miro ? { borderColor: 'var(--color-border-danger)' } : undefined} onChange={(e) => setMiro(e.target.value)} />
              </Field></div>
            </div>
            {files.other && <FileRow kind={files.other.kind} url={files.other.url} />}
            <div className="row gap-sm">
              <Button variant="accent" onClick={save}>Save</Button>
              {!empty && <Button variant="ghost" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</Button>}
            </div>
            <p className="body-sm t-tertiary">Clearing a field and saving removes that link. A project that already had one design link (Figma, Penpot, Sketch or Other) keeps it as it is.</p>
          </>
        ) : empty ? (
          <p className="body-sm t-secondary">No design files linked yet.</p>
        ) : (
          <div className="stack gap-sm">
            {files.figma && <FileRow kind="figma" url={files.figma} />}
            {files.other && <FileRow kind={files.other.kind} url={files.other.url} />}
            {files.miro && <FileRow kind="miro" url={files.miro} />}
          </div>
        )}
        {!admin && <p className="body-sm t-tertiary">Only the project admin can change the design files.</p>}
      </section>

    </div>
  );
}
