#!/usr/bin/env node
// Download one Figma frame screenshot for an issue (ADR-021, compass/design/README.md → Screenshots).
//   node compass/figma-screenshot.mjs <asset-url> <F-xxx-SCR-n>
// <asset-url> is the short-lived https://www.figma.com/api/mcp/asset/<id>.png link that the Figma MCP's
// get_screenshot returns. The file is saved as compass/design/screens/<F-xxx-SCR-n>.png and nowhere else.
// This is the only download that .claude/settings.json allows without a prompt, so it takes exactly two arguments,
// checks both, runs curl without a shell and with fixed options, and keeps the file only if it is a PNG.
// This file is a protected path (compass/guardrails.json): an agent cannot widen what the allow rule permits.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSET = /^https:\/\/www\.figma\.com\/api\/mcp\/asset\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.png$/;
const NAME = /^F-\d{3}-SCR-\d{1,3}$/;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 10 * 1024 * 1024;

/** The checked asset URL, or null. Only the Figma MCP asset path with a UUID id is accepted. */
export const assetUrl = (raw) => (ASSET.test(String(raw ?? '')) ? String(raw) : null);

/** The checked screen name (F-xxx-SCR-n), or null. */
export const screenName = (raw) => (NAME.test(String(raw ?? '')) ? String(raw) : null);

/** Problems with the command-line arguments (empty when they are fine). */
export function argProblems(args) {
  const out = [];
  if (args.length !== 2) out.push(`expected 2 arguments (<asset-url> <F-xxx-SCR-n>), got ${args.length}`);
  if (!assetUrl(args[0])) out.push('the first argument must be https://www.figma.com/api/mcp/asset/<uuid>.png');
  if (!screenName(args[1])) out.push('the second argument must be a screen name like F-015-SCR-8');
  return out;
}

/** True when the bytes start with the PNG signature. */
export const isPng = (buf) => buf.length > PNG.length && buf.subarray(0, PNG.length).equals(PNG);

function main(args) {
  const problems = argProblems(args);
  if (problems.length) {
    process.stderr.write(`figma-screenshot: ${problems.join('; ')}\n`);
    process.exit(2);
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const dir = join(root, 'compass', 'design', 'screens');
  const file = join(dir, `${args[1]}.png`);
  const tmp = `${file}.download`;
  mkdirSync(dir, { recursive: true });
  try {
    execFileSync('curl', ['--silent', '--show-error', '--fail', '--location', '--proto', '=https', '--proto-redir', '=https',
      '--max-redirs', '3', '--max-filesize', String(MAX_BYTES), '--max-time', '60', '--output', tmp, '--', args[0]], { stdio: ['ignore', 'ignore', 'inherit'] });
    if (!isPng(readFileSync(tmp))) throw new Error('the download is not a PNG image');
    renameSync(tmp, file);
  } catch (e) {
    rmSync(tmp, { force: true });
    process.stderr.write(`figma-screenshot: ${e.message}\n`);
    process.exit(1);
  }
  process.stdout.write(`saved compass/design/screens/${args[1]}.png\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
