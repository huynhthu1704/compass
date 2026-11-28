// F-003 Project settings (REQ-080, REQ-082, ADR-015) — design: compass/design/2026-11-27-project-design-files.md (SCR-1, SCR-2, SCR-2b).
import { useState } from 'react';
import { FileRow, FileRows } from '../components/DesignFilesPanel';
import { checkDesignInput, designFiles, FIGMA_HELP, isDesignAdmin, MIRO_HELP, saveDesignFiles, TOOL_NAMES } from '../designLinks';
import { projectKey, useSession } from '../firebase';
import { store, useStore } from '../store';
import { pickedRoles, type Project } from '../types';
import { Badge, Button, Field, PageHead, toast } from '../ui';

export function ProjectSettingsPage({ p }: { p: Project }) {
  const { settings } = useStore();
  const session = useSession();
  const projectRoles = (p.repo && session.access.find((a) => a.id === projectKey(p.repo!))?.roles) || [];
  const admin = isDesignAdmin({ roles: pickedRoles(settings), signIn: session.status, superAdmin: session.superAdmin, projectRoles, demo: !!session.demo || !!p.demo });
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
              <div style={{ flex: '1 1 240px', minWidth: 0 }}><Field id="design-figma" label="Figma file" help={files.other ? `${FIGMA_HELP}. Saving one replaces the ${TOOL_NAMES[files.other.kind]} link.` : FIGMA_HELP} error={errors.figma}>
                <input className={`input mono-sm${errors.figma ? ' error' : ''}`} value={figma} placeholder="https://www.figma.com/design/…" aria-invalid={!!errors.figma} id="design-figma" aria-describedby="design-figma-help" onChange={(e) => setFigma(e.target.value)} />
              </Field></div>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}><Field id="design-miro" label="Miro board" help={MIRO_HELP} error={errors.miro}>
                <input className={`input mono-sm${errors.miro ? ' error' : ''}`} value={miro} placeholder="https://miro.com/app/board/…" aria-invalid={!!errors.miro} id="design-miro" aria-describedby="design-miro-help" onChange={(e) => setMiro(e.target.value)} />
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
          <FileRows files={files} />
        )}
        {!admin && <p className="body-sm t-tertiary">Only the project admin can change the design files.</p>}
      </section>

    </div>
  );
}
