import { DEMO_FILES } from './demofiles';
import { rag } from './rag';
import { newProject, now, uid } from './store';
import type { Project } from './types';

/** A demo project that works without any keys: shows every stage with realistic content. */
export function demoProject(): Project {
  const p = newProject({
    name: 'Travel Journal',
    description: 'A small website where travellers save trips and share a public map of places they visited.',
    demo: true,
    frameworkInstalled: true,
    spec: {
      version: 1,
      idea: {
        intent: 'Increase the number of travellers who publish a trip page within their first week from 10% to 35%',
        problem: 'Travellers keep notes in chat apps and photo galleries; creating a shareable trip page takes too long, so few people publish.',
        users: ['Traveller', 'Friend who views a shared trip', 'Admin'],
        outcomeMetric: 'Share of new users who publish a trip page in 7 days: 10% → 35% within 8 weeks',
        scopeIn: ['Create a trip with places', 'Share a public trip page', 'Map of visited places', 'Sign in with email link'],
        scopeOut: ['Native mobile app', 'Booking and payments'],
        risks: ['Location privacy on public pages', 'Map API cost'],
        stack: 'Static web app (HTML/JS modules), node:test, GitHub Pages',
      },
      requirements: [
        { id: 'REQ-001', title: 'Create a trip with places', priority: 'Must', status: 'Done', story: 'As a traveller, I want to create a trip and add the places I visited, so that my notes are in one place.', ac: ['Given I am signed in\nWhen I enter a trip name and at least one place and save\nThen the trip appears in My trips', 'Given the trip name is empty\nWhen I save\nThen I see "Trip name is required" and nothing is saved'] },
        { id: 'REQ-002', title: 'Share a public trip page', priority: 'Must', status: 'In build', story: 'As a traveller, I want to share a public link to my trip, so that friends can see where I went.', ac: ['Given a saved trip\nWhen I click Share\nThen I get a public URL that opens without signing in', 'Given a trip marked private\nWhen someone opens its URL\nThen they see "This trip is private"'] },
        { id: 'REQ-003', title: 'Map of visited places', priority: 'Should', status: 'Approved', story: 'As a traveller, I want to see my places on a map, so that I can relive the trip at a glance.', ac: ['Given a trip with places that have coordinates\nWhen I open the trip\nThen each place is shown as a pin on the map', 'Given a place without coordinates\nWhen I open the trip\nThen it is listed under "Not on map"'] },
        { id: 'REQ-004', title: 'Sign in with an email link', priority: 'Could', status: 'Draft', story: 'As a traveller, I want to sign in with a link sent to my email, so that I do not need a password.', ac: ['Given I enter a valid email\nWhen I request a link\nThen I receive an email with a one-time link valid for 15 minutes', 'Given the link has expired\nWhen I open it\nThen I am asked to request a new link'] },
      ],
      tests: [
        { id: 'TC-001', reqIds: ['REQ-001'], title: 'Create trip — happy path', type: 'Automated', status: 'Pass', gherkin: 'Given I am signed in\nWhen I save a trip "Đà Lạt 2026" with place "Hồ Xuân Hương"\nThen "Đà Lạt 2026" is listed in My trips' },
        { id: 'TC-002', reqIds: ['REQ-001'], title: 'Create trip — empty name', type: 'Automated', status: 'Pass', gherkin: 'Given I am signed in\nWhen I save a trip with an empty name\nThen I see "Trip name is required"\nAnd no trip is created' },
        { id: 'TC-003', reqIds: ['REQ-002'], title: 'Public link opens without sign-in', type: 'Automated', status: 'Not run', gherkin: 'Given a saved public trip\nWhen an anonymous visitor opens its URL\nThen the trip page is shown' },
        { id: 'TC-004', reqIds: ['REQ-002'], title: 'Private trip is hidden', type: 'Automated', status: 'Not run', gherkin: 'Given a private trip\nWhen an anonymous visitor opens its URL\nThen they see "This trip is private"' },
      ],
      decisions: [{ id: 'ADR-001', title: 'Static site + node:test', decision: 'Keep the site dependency-free (ES modules) so any role can run tests with `npm test` and deploy via GitHub Pages.', date: '2026-11-10' }],
    },
  });
  const t = (min: number) => new Date(Date.now() - min * 60000).toISOString();
  p.releases = [{ tag: 'v0.1.0', name: 'v0.1.0', url: '', date: t(60 * 24 * 3), prs: [1] }];
  p.runs = [{
    id: uid(), agent: 'coder', stage: 'build', goal: 'Share a public trip page', status: 'approved', mode: 'demo', startedAt: t(90), finishedAt: t(88), reqIds: ['REQ-002'], prNumber: 2, branch: 'compass/req-002-share-a-public-trip-page',
    output: 'Implemented REQ-002 with 2 files, including node:test tests.',
    steps: [
      { t: t(90), kind: 'plan', title: 'Coding agent started (demo mode)', detail: 'Goal: Share a public trip page' },
      { t: t(90), kind: 'retrieve', title: 'Retrieved 5 chunks from 9 indexed files + spec' },
      { t: t(90), kind: 'guardrail', title: 'Prompt-injection scan (retrieved context)', ok: true },
      { t: t(89), kind: 'tool_call', title: 'read_file(path: "src/trips.js")' },
      { t: t(89), kind: 'tool_call', title: 'propose_file_change(path: "src/share.js", action: "create")' },
      { t: t(89), kind: 'tool_call', title: 'propose_file_change(path: "tests/share.test.js", action: "create")' },
      { t: t(88), kind: 'eval', title: 'Evaluation: Tests accompany code 1/1 · Requirement ids referenced 2/2' },
      { t: t(88), kind: 'approval', title: 'Approved by human reviewer', ok: true },
      { t: t(88), kind: 'github', title: 'Opened pull request #2 (simulated)', ok: true },
    ],
    changes: [
      { path: 'src/share.js', action: 'create', reason: 'REQ-002: public share link + private check', content: "// REQ-002 · Share a public trip page\nexport function shareUrl(trip, origin) {\n  if (!trip.id) throw new Error('Trip must be saved first');\n  return `${origin}/trip.html?id=${encodeURIComponent(trip.id)}`;\n}\n\nexport function viewTrip(trip) {\n  return trip.private ? { visible: false, message: 'This trip is private' } : { visible: true, trip };\n}\n" },
      { path: 'tests/share.test.js', action: 'create', reason: 'TC-003, TC-004: automated tests for REQ-002', content: "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { shareUrl, viewTrip } from '../src/share.js';\n\ntest('TC-003 public link opens without sign-in', () => {\n  assert.match(shareUrl({ id: 't1' }, 'https://x.io'), /trip\\.html\\?id=t1/);\n  assert.equal(viewTrip({ id: 't1' }).visible, true);\n});\n\ntest('TC-004 private trip is hidden', () => {\n  assert.equal(viewTrip({ id: 't2', private: true }).message, 'This trip is private');\n});\n" },
    ],
    guardrails: [
      { id: 'G1', name: 'Secret scanning', level: 'pass', message: 'No tokens, keys or private keys detected.' },
      { id: 'G2', name: 'Forbidden paths', level: 'pass', message: 'No forbidden paths touched.' },
      { id: 'G3', name: 'Protected paths', level: 'pass', message: 'No CI/deploy or guardrail files changed.' },
      { id: 'G8', name: 'Requirement traceability', level: 'pass', message: 'Linked to REQ-002.' },
    ],
    evals: [
      { id: 'E9', name: 'Tests accompany code', score: 1, max: 1, note: '1 test file(s) for 1 code file(s).' },
      { id: 'E10', name: 'Changes explain themselves', score: 2, max: 2, note: '' },
      { id: 'E11', name: 'Requirement ids referenced', score: 2, max: 2, note: '' },
    ],
  }];
  rag.setRepoDocs(p.id, DEMO_FILES);
  p.createdAt = now();
  return p;
}

