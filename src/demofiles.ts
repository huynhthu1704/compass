/** Repository files of the demo project, used by RAG when no GitHub repo is connected. */
export const DEMO_FILES = [
  { path: 'AGENTS.md', content: '# AGENTS.md — how to continue this project\nFollow compass/spec.json. Branch compass/REQ-xxx. Tests with node:test.' },
  { path: 'README.md', content: '# Travel Journal\nSave trips and share a public map of places you visited.' },
  { path: 'index.html', content: '<!doctype html><main id="app"><h1>Travel Journal</h1></main><script type="module" src="app.js"></script>' },
  { path: 'app.js', content: "import { listTrips } from './src/trips.js';\ndocument.querySelector('#app').insertAdjacentHTML('beforeend', listTrips().map((t) => `<p>${t.name}</p>`).join(''));" },
  { path: 'src/trips.js', content: "// REQ-001 · Create a trip with places\nconst trips = [];\nexport function createTrip(name, places = []) {\n  if (!name || !name.trim()) return { ok: false, error: 'Trip name is required' };\n  const trip = { id: String(trips.length + 1), name: name.trim(), places };\n  trips.push(trip);\n  return { ok: true, trip };\n}\nexport const listTrips = () => [...trips];\n" },
  { path: 'tests/trips.test.js', content: "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { createTrip } from '../src/trips.js';\ntest('TC-001 create trip', () => assert.equal(createTrip('Đà Lạt 2026', ['Hồ Xuân Hương']).ok, true));\ntest('TC-002 empty name', () => assert.equal(createTrip('').error, 'Trip name is required'));\n" },
  { path: 'compass/guardrails.json', content: '{ "protectedPaths": [".github/workflows/"], "maxFilesPerChange": 12 }' },
  { path: 'package.json', content: '{ "name": "travel-journal", "type": "module", "scripts": { "test": "node --test tests/" } }' },
  { path: '.github/workflows/compass-ci.yml', content: 'name: Compass CI\non: [pull_request, push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: node compass/check-spec.mjs\n      - run: npm test' },
];
