// F-003 Project design files (REQ-080 … REQ-082): the project's Figma file and Miro board, as plain data.
// Design: compass/design/2026-11-27-project-design-files.md. Types-only imports, so Node runs this file in tests.
import type { DesignTool, DesignToolKind, Role } from './types.ts';

export const TOOL_NAMES: Record<DesignToolKind, string> = { figma: 'Figma', miro: 'Miro', penpot: 'Penpot', sketch: 'Sketch', other: 'Other' };

export const FIGMA_HELP = 'A figma.com design, file, proto or board link';
export const MIRO_HELP = 'Paste a Miro board link: https://miro.com/app/board/…';

const parse = (raw: string) => { try { return new URL(raw); } catch { return null; } };

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
  if (!tool || !tool.url) return {};
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

/** Who is looking: the role picker, and — when sign-in (Team access, F-015) is on — their roles in this project. */
export type Viewer = { role?: Role | string; signIn: 'off' | 'loading' | 'signed-out' | 'signed-in'; superAdmin: boolean; projectRoles: string[]; demo?: boolean };

/** REQ-080: who may change the design files. With sign-in on: the project's Admin or the super admin (Team access,
 *  F-015). With sign-in off, or in the demo project (which has no team; REQ-040 lets a signed-in person pick a role
 *  there): the PO role from the role picker. */
export const isDesignAdmin = (v: Viewer) => (v.signIn === 'off' || v.demo ? v.role === 'PO' : v.superAdmin || v.projectRoles.includes('Admin'));
