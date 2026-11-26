// F-010 honey brand (REQ-010, REQ-011, REQ-012) — TC-014, TC-015, TC-016, TC-017, TC-019
// The expected values are the Figma design system "Compass — Team floor" › 🎨 Design system (Honey edition v0.2),
// with the AA-safe text shades approved in ADR-004.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const CSS = read('src/index.css');

/** The body of the first CSS block whose selector is exactly `selector`. */
function block(selector) {
  const start = CSS.indexOf(`${selector} {`);
  assert.ok(start >= 0, `missing block ${selector}`);
  const end = CSS.indexOf('\n}', start);
  return CSS.slice(start, end);
}
const vars = (body) => Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const LIGHT = vars(block(':root'));
const DARK = { ...LIGHT, ...vars(block('[data-theme="dark"]')) };

/** Resolves a token (following var() chains) to an upper-case hex colour. */
function resolve(theme, name) {
  let v = theme[name];
  for (let i = 0; i < 10 && v && v.startsWith('var('); i++) v = theme[v.slice(6, -1)];
  assert.ok(v, `token --${name} is not defined`);
  return v.toUpperCase();
}
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const EXPECTED = {
  light: {
    'color-bg-canvas': '#FFFCF5', 'color-bg-surface': '#FFFFFF', 'color-bg-subtle': '#FFF9E6', 'color-bg-muted': '#F2EEE7',
    'color-bg-brand': '#FFC629', 'color-bg-brand-subtle': '#FFF0C2', 'color-bg-accent': '#FFC629', 'color-bg-accent-subtle': '#FFF9E6',
    'color-bg-success-subtle': '#DDF6EC', 'color-bg-danger-subtle': '#FFE6DE', 'color-bg-info-subtle': '#E1EFFF',
    'color-text-primary': '#1F1A14', 'color-text-secondary': '#4A4237', 'color-text-tertiary': '#6E6559', 'color-text-on-brand': '#1F1A14',
    'color-text-brand': '#8A5F00', 'color-text-accent': '#8A5F00', 'color-text-success': '#17704F', 'color-text-danger': '#B0432A', 'color-text-info': '#1B62B5',
    'color-border-default': '#E6DFD3', 'color-border-subtle': '#F2EEE7', 'color-border-brand': '#F5B000', 'color-border-danger': '#FF7A59',
  },
  dark: {
    'color-bg-canvas': '#17130E', 'color-bg-surface': '#1F1A14', 'color-bg-subtle': '#2A241C', 'color-bg-muted': '#3A3226',
    'color-bg-brand': '#FFC629', 'color-bg-brand-subtle': '#4D3500', 'color-bg-accent': '#FFC629', 'color-bg-accent-subtle': '#3A2C0A',
    'color-bg-success-subtle': '#173A2D', 'color-bg-danger-subtle': '#4A2419', 'color-bg-info-subtle': '#16304D',
    'color-text-primary': '#FFF9E6', 'color-text-secondary': '#CFC7BA', 'color-text-tertiary': '#B3A999', 'color-text-on-brand': '#1F1A14',
    'color-text-brand': '#FFD452', 'color-text-accent': '#FFD452', 'color-text-success': '#5FD3A9', 'color-text-danger': '#FF9A80', 'color-text-info': '#7DBBFF',
    'color-border-default': '#3A3226', 'color-border-subtle': '#2A241C', 'color-border-brand': '#FFC629', 'color-border-danger': '#FF7A59',
  },
};
const THEMES = { light: LIGHT, dark: DARK };

test('TC-014 (REQ-010): colour tokens match the honey design system in light and dark mode', () => {
  for (const [mode, want] of Object.entries(EXPECTED))
    for (const [name, hex] of Object.entries(want)) assert.equal(resolve(THEMES[mode], name), hex, `${mode} --${name}`);
});

test('TC-015 (REQ-010): every normal text colour reaches 4.5:1 on its backgrounds in both modes', () => {
  const BASE_BG = ['canvas', 'surface', 'subtle', 'brand-subtle', 'muted'];
  const pairs = [];
  for (const t of ['primary', 'secondary', 'tertiary', 'brand']) for (const b of BASE_BG) pairs.push([`text-${t}`, `bg-${b}`]);
  for (const t of ['success', 'danger', 'info', 'accent', 'warning']) for (const b of ['canvas', 'surface', 'subtle']) pairs.push([`text-${t}`, `bg-${b}`]);
  for (const t of ['success', 'danger', 'info', 'accent', 'warning']) pairs.push([`text-${t}`, `bg-${t}-subtle`]);
  pairs.push(['text-on-brand', 'bg-brand'], ['text-inverse', 'bg-inverse']);
  for (const p of ['discover', 'define', 'design', 'build', 'release', 'monitor']) pairs.push([`phase-${p}-fg`, `phase-${p}-bg`]);
  for (const [mode, theme] of Object.entries(THEMES))
    for (const [fg, bg] of pairs) {
      const c = contrast(resolve(theme, `color-${fg}`), resolve(theme, `color-${bg}`));
      assert.ok(c >= 4.5, `${mode}: --color-${fg} on --color-${bg} is ${c.toFixed(2)}:1`);
    }
});

test('TC-016 (REQ-011): headings use Lexend SemiBold, body Be Vietnam Pro, ids JetBrains Mono', () => {
  assert.match(LIGHT['font-heading'], /^"Lexend"/);
  assert.match(LIGHT['font-sans'], /^"Be Vietnam Pro"/);
  assert.match(LIGHT['font-mono'], /^"JetBrains Mono"/);
  const rule = CSS.match(/([^{}]*)\{\s*font-family:\s*var\(--font-heading\);\s*font-weight:\s*600;\s*\}/);
  assert.ok(rule, 'one rule sets font-family: var(--font-heading); font-weight: 600');
  for (const sel of ['h1', 'h2', 'h3', 'h4', '.h1', '.h2', '.h3', '.h4', '.display-xl', '.display-lg'])
    assert.ok(rule[1].split(',').map((s) => s.trim()).includes(sel), `heading rule covers ${sel}`);
  const html = read('index.html');
  assert.match(html, /fonts\.googleapis\.com\/css2\?[^"]*family=Lexend:wght@600/, 'Lexend 600 is loaded from Google Fonts');
});

/** All .ts/.tsx/.css files under src/, except the starter files Compass writes into other repos. */
function sourceFiles(dir = join(ROOT, 'src')) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return relative(ROOT, p) === join('src', 'framework') ? [] : sourceFiles(p);
    return /\.(tsx?|css)$/.test(n) && relative(ROOT, p) !== join('src', 'framework.ts') ? [p] : [];
  });
}

test('TC-017 (REQ-012): no old teal and no hard-coded colour outside the token blocks in src/', () => {
  const TEAL = ['#EDFAF7', '#D2F2EA', '#6ECDB9', '#38B09A', '#0E7666', '#0D5E52', '#0C3A34'];
  const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
  const files = sourceFiles();
  assert.ok(files.length > 10, 'scans the portal source');
  for (const f of files) {
    let text = readFileSync(f, 'utf8');
    for (const t of TEAL) assert.ok(!text.toUpperCase().includes(t), `${relative(ROOT, f)} still has teal ${t}`);
    if (f.endsWith('index.css')) text = text.replace(block(':root'), '').replace(block('[data-theme="dark"]'), '');
    const found = text.match(COLOUR);
    assert.equal(found, null, `${relative(ROOT, f)} has hard-coded colour(s) outside the tokens: ${found?.join(', ')}`);
  }
  assert.ok(!read('public/favicon.svg').toUpperCase().includes('#0E7666'), 'favicon is no longer teal');
});

test('TC-019 (REQ-010): one meaning per state colour', () => {
  const family = (hex) => ({
    '#FFC629': 'honey', '#FFF0C2': 'honey', '#FFF9E6': 'honey', '#8A5F00': 'honey', '#FFD452': 'honey', '#4D3500': 'honey', '#3A2C0A': 'honey',
    '#E1EFFF': 'sky', '#1B62B5': 'sky', '#16304D': 'sky', '#7DBBFF': 'sky',
    '#DDF6EC': 'mint', '#17704F': 'mint', '#173A2D': 'mint', '#5FD3A9': 'mint',
    '#FFE6DE': 'coral', '#B0432A': 'coral', '#4A2419': 'coral', '#FF9A80': 'coral',
  })[hex];
  const MEANING = { brand: 'honey', accent: 'honey', warning: 'honey', info: 'sky', success: 'mint', danger: 'coral' };
  for (const [mode, theme] of Object.entries(THEMES))
    for (const [tone, fam] of Object.entries(MEANING)) {
      const bg = tone === 'brand' ? 'color-bg-brand-subtle' : `color-bg-${tone}-subtle`;
      assert.equal(family(resolve(theme, bg)), fam, `${mode} tone-${tone} background is ${fam}`);
      assert.equal(family(resolve(theme, `color-text-${tone}`)), fam, `${mode} tone-${tone} text is ${fam}`);
    }
  const run = read('src/components/RunView.tsx').match(/STATUS_TONE = (\{[^}]*\})/);
  assert.ok(run, 'RunView defines STATUS_TONE');
  const tones = Object.fromEntries([...run[1].matchAll(/'?([\w-]+)'?:\s*'(\w+)'/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(tones, { running: 'info', 'awaiting-approval': 'accent', approved: 'success', rejected: 'neutral', failed: 'danger', done: 'success' });
});
