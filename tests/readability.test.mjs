// F-011 readability follow-ups — TC-023, TC-024 (REQ-013). TC-025/026 (REQ-014) are checked with screenshots. TC-508 (REQ-108).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/** Parses `export const NAME ... = { a: 'x', 'b c': 'y' }` from src/ui.tsx. */
function map(name) {
  const m = read('src/ui.tsx').match(new RegExp(`export const ${name}[^=]*=\\s*(\\{[^}]*\\})`));
  assert.ok(m, `src/ui.tsx exports ${name}`);
  return Object.fromEntries([...m[1].matchAll(/'?([\w ]+?)'?\s*:\s*'(\w+)'/g)].map((x) => [x[1].trim(), x[2]]));
}

test('TC-023 (REQ-013): Draft is neutral, Approved is mint, on all five pages', () => {
  assert.deepEqual(map('REQ_STATUS_TONE'), { Draft: 'neutral', Approved: 'success', 'In build': 'info', Done: 'success' });
  assert.deepEqual(map('DESIGN_STATUS_TONE'), { Draft: 'neutral', Approved: 'success' });
  for (const page of ['Requirements', 'Tests', 'Feature', 'Build']) {
    const src = read(`src/pages/${page}.tsx`);
    assert.match(src, /<Badge tone=\{REQ_STATUS_TONE\[r\.status\]\}>\{r\.status\}<\/Badge>/, `${page} uses REQ_STATUS_TONE`);
    assert.doesNotMatch(src, /tone=\{r\.status ===/, `${page} has no inline status colour rule left`);
    assert.doesNotMatch(src, /const STATUS_TONE = \{ Draft/, `${page} has no own status map`);
  }
  const design = read('src/pages/Design.tsx');
  assert.match(design, /<Badge tone=\{DESIGN_STATUS_TONE\[d\.status\]\}>\{d\.status\}<\/Badge>/, 'Design uses DESIGN_STATUS_TONE');
});

test('TC-024 (REQ-013): neutral, info and success label text reach 4.5:1 in light and dark mode', () => {
  const css = read('src/index.css');
  const block = (sel) => { const s = css.indexOf(`${sel} {`); return css.slice(s, css.indexOf('\n}', s)); };
  const vars = (b) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const light = vars(block(':root')); const dark = { ...light, ...vars(block('[data-theme="dark"]')) };
  const hex = (t, n) => { let v = t[n]; for (let i = 0; i < 10 && v?.startsWith('var('); i++) v = t[v.slice(6, -1)]; return v; };
  const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)).reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const TONES = { neutral: ['color-text-secondary', 'color-bg-muted'], info: ['color-text-info', 'color-bg-info-subtle'], success: ['color-text-success', 'color-bg-success-subtle'] };
  for (const sel of ['.tone-neutral', '.tone-info', '.tone-success']) assert.ok(css.includes(sel), `${sel} exists`);
  for (const [mode, t] of Object.entries({ light, dark }))
    for (const [tone, [fg, bg]] of Object.entries(TONES)) {
      const c = cr(hex(t, fg), hex(t, bg));
      assert.ok(c >= 4.5, `${mode} ${tone}: ${c.toFixed(2)}:1`);
    }
});

test('TC-025 (REQ-014): below 720 px the stage strip is one stage per row', () => {
  const css = read('src/index.css');
  assert.match(css, /\.stage-strip \{[^}]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/, 'desktop keeps five columns');
  assert.match(css, /@media \(max-width: 719px\) \{[^}]*\.stage-strip \{[^}]*grid-template-columns: 1fr/, 'one column below 720 px');
  const feature = read('src/pages/Feature.tsx');
  assert.match(feature, /className="stage-strip"/);
  assert.doesNotMatch(feature, /gridTemplateColumns: 'repeat\(5/, 'no inline columns that would override the phone rule');
});

test('TC-027 (REQ-015): pages use up to 1600 px with fluid side padding; the phone rule is unchanged', () => {
  const css = read('src/index.css');
  const main = css.match(/^\.main \{([^}]*)\}/m);
  assert.ok(main, '.main rule exists');
  assert.match(main[1], /max-width: 1600px/);
  assert.match(main[1], /width: 100%/);
  assert.match(main[1], /min-width: 0/, 'wide boards scroll inside themselves, not the page');
  assert.match(main[1], /padding: var\(--spacing-2xl\) clamp\(var\(--spacing-lg\), 3vw, var\(--spacing-3xl\)\) var\(--spacing-4xl\)/);
  const phone = css.slice(css.indexOf('@media (max-width: 900px) {'), css.indexOf('\n}', css.indexOf('@media (max-width: 900px) {')));
  assert.match(phone, /\.main \{ padding: var\(--spacing-xl\) var\(--spacing-lg\) var\(--spacing-3xl\); \}/, 'below-900 px .main rule unchanged');
  assert.match(css, /\.arch \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/, 'architecture columns can shrink (no sideways scroll above 900 px)');
  assert.match(css, /@media \(max-width: 900px\) \{ \.arch \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/, 'and on phones');
  assert.match(css, /^\.option:has\(> \.grow\) \{ flex-wrap: wrap; \}/m, 'rows with a flexible text part (Release, Build, run changes) wrap on phones');
  assert.match(css, /\.option:has\(> \.grow\) > \.grow \{ flex-basis: 8rem; \}/, 'their text keeps at least 8rem and moves to its own line instead of being squeezed');
  assert.match(css, /\.option > \.mono \{ min-width: 0; overflow-wrap: anywhere; \}/, 'long file paths in option rows can break');
  assert.doesNotMatch(css.match(/^\.option \{[^}]*\}/m)[0], /flex-wrap/, 'other option rows (role picker, run lists) keep one line');
});

test('TC-508 (REQ-108): acceptance criteria and test steps are 13 px on the run page, other small mono text stays 11 px', () => {
  const css = read('src/index.css');
  const rule = (sel) => { const m = css.match(new RegExp(`^${sel.replace('.', '\\.')} \\{([^}]*)\\}`, 'm')); assert.ok(m, `${sel} rule exists`); return { body: m[1], at: m.index }; };
  const ac = rule('.ac-line'), mono = rule('.mono-sm');
  assert.match(ac.body, /font-size:\s*13px/, '.ac-line is 13px');
  assert.match(ac.body, /line-height:\s*20px/, '.ac-line has a 20px line height');
  assert.match(ac.body, /white-space:\s*pre-line/, '.ac-line keeps line breaks');
  assert.ok(ac.at > mono.at, '.ac-line comes after .mono-sm so it wins');
  assert.match(mono.body, /font-size:\s*11px;\s*line-height:\s*16px/, '.mono-sm is unchanged');
  const run = read('src/components/RunView.tsx');
  assert.match(run, /className="[^"]*\bac-line\b[^"]*" data-quote-source=\{`\$\{q\.id\} · AC \$\{i \+ 1\}`\}/, 'AC lines use ac-line');
  assert.match(run, /className="[^"]*\bac-line\b[^"]*" data-quote-source=\{`\$\{t\.id\} · gherkin`\}/, 'test steps use ac-line');
});
