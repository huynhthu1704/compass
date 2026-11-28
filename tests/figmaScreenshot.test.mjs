// ADR-021 — compass/figma-screenshot.mjs only downloads a Figma MCP asset into compass/design/screens/<F-xxx-SCR-n>.png
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assetUrl, screenName, argProblems, isPng } from '../compass/figma-screenshot.mjs';

const ID = '3ef7dbab-4d3f-4c6f-9cd7-9d67d641b7e3';
const URL_OK = `https://www.figma.com/api/mcp/asset/${ID}.png`;

test('figma-screenshot: accepts only the Figma MCP asset URL with a UUID id', () => {
  assert.equal(assetUrl(URL_OK), URL_OK);
  for (const bad of [
    `http://www.figma.com/api/mcp/asset/${ID}.png`,
    `https://figma.com/api/mcp/asset/${ID}.png`,
    `https://www.figma.com.evil.example/api/mcp/asset/${ID}.png`,
    `https://evil.example/https://www.figma.com/api/mcp/asset/${ID}.png`,
    `https://www.figma.com/api/mcp/asset/${ID}.png?x=1`,
    `https://www.figma.com/api/mcp/asset/../../${ID}.png`,
    `https://www.figma.com/api/mcp/asset/${ID}.png https://evil.example`,
    `https://www.figma.com/api/mcp/asset/${ID}.png\n`,
    `-T`, '', undefined,
  ]) assert.equal(assetUrl(bad), null, String(bad));
});

test('figma-screenshot: the file name is only F-xxx-SCR-n', () => {
  assert.equal(screenName('F-015-SCR-8'), 'F-015-SCR-8');
  assert.equal(screenName('F-013-SCR-11'), 'F-013-SCR-11');
  for (const bad of ['../F-015-SCR-8', 'F-015-SCR-8.png', '/tmp/x', '.claude/settings', 'F-15-SCR-8', 'F-015-SCR-8/..', '']) assert.equal(screenName(bad), null, bad);
});

test('figma-screenshot: exactly two arguments', () => {
  assert.deepEqual(argProblems([URL_OK, 'F-015-SCR-8']), []);
  assert.ok(argProblems([URL_OK]).length);
  assert.ok(argProblems([URL_OK, 'F-015-SCR-8', '--output']).length);
  assert.ok(argProblems(['-T', 'F-015-SCR-8']).length);
});

test('figma-screenshot: keeps only PNG bytes', () => {
  assert.ok(isPng(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])));
  assert.ok(!isPng(Buffer.from('<html>not an image</html>')));
  assert.ok(!isPng(Buffer.alloc(0)));
});

test('figma-screenshot: the allow rule names this script only, and the script is protected', () => {
  const settings = JSON.parse(readFileSync(new URL('../.claude/settings.json', import.meta.url), 'utf8'));
  assert.deepEqual(settings.permissions.allow, ['Bash(node compass/figma-screenshot.mjs *)']);
  const guardrails = JSON.parse(readFileSync(new URL('../compass/guardrails.json', import.meta.url), 'utf8'));
  assert.ok(guardrails.protectedPaths.includes('compass/figma-screenshot.mjs'));
});
