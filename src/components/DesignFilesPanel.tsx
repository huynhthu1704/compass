// F-003 Project design files (REQ-081) — the "Design files" side panel of the Design page (a bottom sheet on phones),
// and the file row shared with Project settings. Design: compass/design/2026-11-27-project-design-files.md (SCR-3b, SCR-4b).
import { useEffect, useRef } from 'react';
import { go } from '../App';
import { fileName, type DesignFiles } from '../designLinks';
import type { DesignToolKind } from '../types';

const MARK: Record<DesignToolKind, string> = { figma: 'F', miro: 'M', penpot: 'P', sketch: 'S', other: '↗' };

/** One linked file: tool mark, name, link and Open ↗ (new tab). */
export function FileRow({ kind, url }: { kind: DesignToolKind; url: string }) {
  const name = fileName(kind);
  return (
    <div className="file-row">
      <span className={`file-mark tone-${kind === 'miro' ? 'accent' : 'info'}`} aria-hidden>{MARK[kind]}</span>
      <div className="stack grow" style={{ minWidth: 0 }}>
        <span className="body-sm" style={{ fontWeight: 600 }}>{name}</span>
        <span className="mono-sm t-secondary file-url">{url}</span>
      </div>
      <a className="btn ghost sm" href={url} target="_blank" rel="noreferrer" aria-label={`Open the ${name} in a new tab`}>Open ↗</a>
    </div>
  );
}

/** Rows for every linked file, in the order Figma, older tool, Miro. */
export const FileRows = ({ files }: { files: DesignFiles }) => (
  <div className="stack gap-sm">
    {files.figma && <FileRow kind="figma" url={files.figma} />}
    {files.other && <FileRow kind={files.other.kind} url={files.other.url} />}
    {files.miro && <FileRow kind="miro" url={files.miro} />}
  </div>
);

type Props = { files: DesignFiles; admin: boolean; settingsPath: string; onClose: () => void };

/** REQ-081: read-only list of the project's design files. Esc, ✕ or a click outside closes it (the caller restores focus). */
export function DesignFilesPanel({ files, admin, settingsPath, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const empty = !files.figma && !files.miro && !files.other;
  useEffect(() => { panel.current?.focus(); }, []);
  return (
    <div className="panel-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}>
      <div ref={panel} className="side-panel stack gap-md" role="dialog" aria-modal="true" aria-label="Design files" tabIndex={-1}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
        <span className="sheet-grabber" aria-hidden />
        <div className="row gap-sm">
          <h2 className="h4 grow">Design files</h2>
          <button className="btn ghost sm" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {empty ? <p className="body-sm t-secondary">No design files linked yet.</p> : <FileRows files={files} />}
        {admin
          ? <div><button className="btn secondary sm" onClick={() => { onClose(); go(settingsPath); }}>Change in Project settings →</button></div>
          : <p className="body-sm t-tertiary">Only the project admin can change the design files.</p>}
      </div>
    </div>
  );
}
