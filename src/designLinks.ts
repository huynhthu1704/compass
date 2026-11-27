// F-003 Project design files (REQ-080 … REQ-082): the project's Figma file and Miro board, as plain data.
// Design: compass/design/2026-11-27-project-design-files.md. Types-only imports, so Node runs this file in tests.
import type { DesignTool, DesignToolKind, Role } from './types.ts';

export const TOOL_NAMES: Record<DesignToolKind, string> = { figma: 'Figma', miro: 'Miro', penpot: 'Penpot', sketch: 'Sketch', other: 'Other' };

export const FIGMA_HELP = 'A figma.com design, file, proto or board link';
export const MIRO_HELP = 'Paste a Miro board link: https://miro.com/app/board/…';

/** A plain https URL: no port, no user name or password in it. */
const parse = (raw: string) => { try { const u = new URL(raw); return u.protocol === 'https:' && !u.port && !u.username && !u.password ? u : null; } catch { return null; } };

/** REQ-080: an https figma.com (or www.figma.com) link to a design, file, prototype or FigJam board. Empty is allowed. */
export function checkFigmaUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const u = parse(s);
  const ok = !!u && u.protocol === 'https:' && /^(www\.)?figma\.com$/.test(u.hostname) && /^\/(design|file|proto|board)\/[\w-]+/.test(u.pathname);
  return ok ? null : FIGMA_HELP;
}

/** REQ-080: an https miro.com board link (https://miro.com/app/board/<id>/). Empty is allowed. */
export function checkMiroUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  return miroBoardId(s) ? null : MIRO_HELP;
}

/** The board id of an https://miro.com/app/board/<id>/ link, or null. */
export function miroBoardId(raw: string): string | null {
  const u = parse(raw.trim());
  if (!u || u.protocol !== 'https:' || u.hostname !== 'miro.com') return null;
  const m = /^\/app\/board\/([A-Za-z0-9_=-]+)\/?$/.exec(u.pathname);
  return m ? m[1] : null;
}

export type DesignFiles = { figma?: string; miro?: string; other?: { kind: DesignToolKind; url: string } };

/** REQ-082: the project's design files, read from every shape of `designTool` (old single links included). */
export function designFiles(tool?: DesignTool): DesignFiles {
  if (!tool) return {};
  if (!tool.url) return tool.miroUrl ? { miro: tool.miroUrl } : {}; // a hand-edited spec: keep the board
  const out: DesignFiles = {};
  if (tool.kind === 'figma') out.figma = tool.url;
  else if (tool.kind === 'miro') out.miro = tool.url;
  else out.other = { kind: tool.kind, url: tool.url };
  if (tool.kind !== 'miro' && tool.miroUrl) out.miro = tool.miroUrl;
  return out;
}

/**
 * REQ-080 / REQ-082: the new `designTool` after the admin saves the two fields (already checked).
 * `kind` + `url` hold the main link (Figma, else an old Penpot/Sketch/Other link, else Miro) so older readers keep
 * working; a Miro board next to another link goes in `miroUrl`. No link left → undefined (designTool is removed).
 */
export function saveDesignFiles(current: DesignTool | undefined, input: { figma: string; miro: string }): DesignTool | undefined {
  const figma = input.figma.trim(), miro = input.miro.trim();
  const old = designFiles(current).other;
  const main: DesignTool | undefined = figma ? { kind: 'figma', url: figma } : old ? { kind: old.kind, url: old.url } : miro ? { kind: 'miro', url: miro } : undefined;
  if (!main) return undefined;
  return main.kind !== 'miro' && miro ? { ...main, miroUrl: miro } : main;
}

/**
 * REQ-080 / REQ-082: the field errors when the admin saves. A link is checked only when it changed, so an older
 * project whose stored link predates these checks (e.g. a Figma project page) can still add its Miro board.
 */
export function checkDesignInput(current: DesignTool | undefined, input: { figma: string; miro: string }): { figma?: string; miro?: string } {
  const f = designFiles(current);
  const figma = input.figma.trim() === (f.figma || '') ? null : checkFigmaUrl(input.figma);
  const miro = input.miro.trim() === (f.miro || '') ? null : checkMiroUrl(input.miro);
  return { ...(figma ? { figma } : {}), ...(miro ? { miro } : {}) };
}

/** Who is looking: the role picker, and — when sign-in (Team access, F-015) is on — their roles in this project. */
export type Viewer = { role?: Role | string; signIn: 'off' | 'loading' | 'signed-out' | 'signed-in'; superAdmin: boolean; projectRoles: string[]; demo?: boolean };

/** REQ-080: who may change the design files. With sign-in on: the project's Admin or the super admin (Team access,
 *  F-015). With sign-in off, or in the demo (`session.demo` or a demo project: no team, and REQ-040 lets a signed-in
 *  person pick a demo role): the PO role from the role picker, or the super admin (who can open sample projects
 *  outside the demo, where the role picker is hidden). */
export const isDesignAdmin = (v: Viewer) => (v.signIn === 'off' || v.demo ? v.role === 'PO' || v.superAdmin : v.superAdmin || v.projectRoles.includes('Admin'));

/** REQ-081 / REQ-082: how a linked file is named in rows ("Figma file", "Miro board", "Penpot link"…). */
export const fileName = (kind: DesignToolKind) => (kind === 'figma' ? 'Figma file' : kind === 'miro' ? 'Miro board' : `${TOOL_NAMES[kind]} link`);

/** REQ-081: Figma's official embed URL for a checked figma.com link, or null. */
export const figmaEmbed = (url?: string) => (url && !checkFigmaUrl(url) ? `https://www.figma.com/embed?embed_host=compass&url=${encodeURIComponent(url.trim())}` : null);

/** REQ-081: Miro's live-embed URL for a checked board link, or null. */
export function miroEmbed(url?: string): string | null {
  const id = url ? miroBoardId(url) : null;
  return id ? `https://miro.com/app/live-embed/${id}/` : null;
}

export type Preview = { kind: 'figma' | 'miro'; label: string; src: string };

/** REQ-081: the previews a Design page shows — Figma (the feature's frame link first, else the project file), then Miro. */
export function designPreviews(files: DesignFiles, featureUrl?: string): Preview[] {
  const out: Preview[] = [];
  const fig = figmaEmbed(featureUrl) || figmaEmbed(files.figma);
  if (fig) out.push({ kind: 'figma', label: 'Figma preview', src: fig });
  const miro = miroEmbed(files.miro);
  if (miro) out.push({ kind: 'miro', label: 'Miro preview', src: miro });
  return out;
}

/** REQ-082: one line naming every design file, for the design agent's prompt, AGENTS.md and the design views. */
export function designToolText(tool?: DesignTool): string | null {
  const f = designFiles(tool);
  const parts = [f.figma && `Figma ${f.figma}`, f.other && `${TOOL_NAMES[f.other.kind]} ${f.other.url}`, f.miro && `Miro ${f.miro}`].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** REQ-082: the same as Markdown links, for generated files. */
export function designToolMd(tool?: DesignTool): string | null {
  const f = designFiles(tool);
  const parts = [f.figma && `[Figma](${f.figma})`, f.other && `[${TOOL_NAMES[f.other.kind]}](${f.other.url})`, f.miro && `[Miro](${f.miro})`].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
