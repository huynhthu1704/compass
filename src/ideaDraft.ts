// Offline Ideation draft (no AI key): revises a business need into a brief.
// REQ-020 / ADR-005: "Done when" in plain words, never an invented baseline or target.
// Types-only imports, so Node 22 runs this file directly in tests.
import type { Idea } from './types';

export function demoIdea(need: string): Idea {
  // Revise the business need into a business intent (who, what changes) and what will be true when it is done
  const n = need.trim().replace(/[.!?]$/, '');
  const hasNumbers = /\d/.test(n) && /\d+\s*%|→|->/.test(n); // the need's own numbers, never added by the draft
  const core = n.replace(/^(we|i|they)\s+(really\s+)?(need|want|would like)\s+/i, '').replace(/^(cần|muốn)\s+/i, '');
  const who = core.match(/^([a-zà-ỹ ]+?)\s+to\s+(.+)$/i);
  const brief = demoBrief(who ? `${who[2]} for ${who[1]}` : core);
  const users = who ? who[1].trim() : `${brief.users[0].toLowerCase().replace(/s$/, '')}s`;
  const action = who ? who[2] : core.charAt(0).toLowerCase() + core.slice(1);
  const intent = hasNumbers ? n : `${users.charAt(0).toUpperCase() + users.slice(1)} can ${action} on their own, without manual work`;
  const done = `${users.charAt(0).toUpperCase() + users.slice(1)} can ${action} in the product without manual work, and every acceptance criterion of the feature passes.`;
  const doneOwn = 'The change described in the need is live, and every acceptance criterion of the feature passes.';
  return { ...brief, need: need.trim(), intent, outcomeMetric: hasNumbers ? `${doneOwn}\nSignal to watch (from the need): ${n}` : done, problem: `Today ${users} cannot ${action} without manual work.` };
}

export function demoBrief(intent: string): Idea {
  const users = (intent.match(/\bfor ([^,.]+)/i)?.[1] || intent.match(/\b(customers?|users?|travell?ers?|students?|teachers?|staff|employees?|shoppers?|patients?|members?)\b/i)?.[1] || 'Customer').split(/,| and /).map((x) => x.trim()).filter(Boolean);
  if (!users.some((u) => /admin|owner/i.test(u))) users.push('Admin');
  const parts = intent.split(/,| and | và /).map((x) => x.trim()).filter((x) => x.length > 3);
  return {
    intent: intent.trim(),
    problem: `Today ${users[0].toLowerCase()} cannot ${intent.charAt(0).toLowerCase() + intent.slice(1).replace(/\.$/, '')} easily; the work is manual.`,
    users,
    outcomeMetric: `${users[0]} can ${intent.charAt(0).toLowerCase() + intent.slice(1).replace(/\.$/, '')} in the product, and every acceptance criterion passes.`,
    scopeIn: parts.length > 1 ? parts : [`Core flow: ${intent}`, 'Sign-in and profile', 'Admin overview'],
    scopeOut: ['Native mobile apps', 'Payments (phase 2)'],
    risks: ['"Done when" not yet confirmed by the Product Owner', 'Data privacy', 'Adoption by users'],
  };
}
