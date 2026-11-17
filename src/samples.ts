import { byId } from './catalog';
import { GENERATORS, generateStories, sampleMetrics } from './generators';
import { extractProfile, newDoc, search, sourcesMarkdown, toSources } from './knowledge';
import { cleanTitle } from './run';
import { emptyProfile, uid } from './store';
import type { Product, Project } from './types';

export function newProduct(partial: Partial<Product>): Product {
  const now = new Date().toISOString();
  return { id: uid(), name: 'Untitled product', description: '', domain: '', productType: 'B2C', stage: 'Existing product', origin: 'scratch', docs: [], profile: emptyProfile(), createdAt: now, updatedAt: now, ...partial };
}

export function newProject(partial: Partial<Project>): Project {
  const now = new Date().toISOString();
  return {
    id: uid(), productId: '', name: 'Untitled initiative', intent: '', domain: '', productType: 'B2C', stage: 'Existing product', size: 'medium',
    features: [], answers: {}, artefacts: [], stories: [], changelog: [], metrics: [], alertThreshold: 15, skipped: [], checklist: {},
    createdAt: now, updatedAt: now, ...partial,
  };
}

const KB = [
  ['ShopNow PRD — Mobile web shop v3', 'Product spec / PRD', `# ShopNow mobile web shop — PRD v3
ShopNow is a fashion e-commerce shop serving Vietnamese shoppers on mobile web and app. 78% of sessions are on mobile. Average order value (AOV) is 420,000 VND.

## Personas
Persona: Busy office shopper, Student bargain hunter, Gift buyer

## Catalogue & search
Shoppers browse categories, filter by size, colour and price, and search by keyword. Search uses Elastic; zero-result rate is 9%.

## Cart
Cart keeps items for 30 days for signed-in users only. Guest carts are lost when the browser closes.

## Checkout
Checkout has 5 steps: sign in / register → address → delivery option → payment → review. Registration is mandatory. Delivery fee is shown only at the review step.

## Payments
Supported: COD, MoMo, VNPay, credit card via the payment gateway. PCI-DSS scope must not be extended; card data is never stored by ShopNow.

## Loyalty
ShopNow Points: 1 point per 10,000 VND; redeem at checkout.`],
  ['User research — checkout interviews (Sep 2026)', 'User research', `# Checkout interviews, 12 mobile shoppers
## Key findings
- 8 of 12 abandoned at "create account": "I just want to buy one dress, why do I need a password?"
- 7 of 12 were surprised by the delivery fee at the last step and went to compare with Shopee.
- Students prefer COD; office shoppers prefer MoMo one-tap.
- Gift buyers need a different delivery address each time and a gift note.
## Quotes
"The shipping fee appeared at the end, I felt tricked."
"Typing my address on the phone is painful."`],
  ['Analytics — funnel & KPIs Q3 2026', 'Analytics & KPIs', `# Funnel (mobile web, Q3 2026)
| Step | Users | Step conversion |
|---|---|---|
| Product view | 1,200,000 | – |
| Add to cart | 216,000 | 18% |
| Checkout start | 108,000 | 50% |
| Order placed | 34,560 | 32% |

## KPIs
- Checkout completion rate (mobile): 32% (desktop 51%)
- Cart abandonment: 68%
- Repeat purchase rate within 90 days: 22%
- NPS: 31
- Average delivery fee: 25,000 VND`],
  ['Support tickets summary — Oct 2026', 'Support & feedback', `# Top contact reasons (Oct 2026, 4,180 tickets)
1. Where is my order / delivery status — 31%
2. Forgot password / cannot log in at checkout — 18%
3. Delivery fee higher than expected — 12%
4. Payment failed with MoMo — 9%
5. Change address after ordering — 7%`],
  ['Glossary', 'Glossary', `# ShopNow glossary
- AOV: Average order value, total revenue divided by number of orders
- COD: Cash on delivery, customer pays the courier
- Checkout completion: orders placed divided by checkout starts
- ShopNow Points: loyalty points earned on each order
- Guest checkout: buying without creating an account`],
  ['Architecture overview', 'Technical / architecture', `# Architecture
## Services
Frontend: Next.js mobile web. Backend: order-service, cart-service, user-service, payment-service (adapter to MoMo, VNPay, card gateway), shipping-service (GHN, GHTK rate APIs).
## Constraints
- Shipping fee API (GHN) responds in ~800 ms; must be cached per district.
- Release train every 2 weeks; feature flags via LaunchDarkly.
- Personal data must comply with Decree 13/2023 on personal data protection.`],
] as const;

/** A complete demo: an imported product knowledge base + one initiative already in the Monitor phase. */
export function sampleProduct(): { product: Product; projects: Project[] } {
  let product = newProduct({
    name: 'ShopNow', description: 'Fashion e-commerce for Vietnamese shoppers — mobile web & app.', domain: 'E-commerce (fashion retail)', productType: 'B2C', stage: 'Existing product', origin: 'imported',
    docs: KB.map(([t, c, body]) => newDoc(t, body, undefined, c)),
  });
  product = { ...product, profile: extractProfile(product) };

  let p = newProject({
    productId: product.id,
    name: 'Checkout drop-off',
    intent: 'Reduce checkout drop-off on the mobile web shop by 20% this quarter',
    domain: product.domain, productType: 'B2C', stage: 'Existing product', size: 'medium',
    features: ['Guest checkout without account', 'Saved addresses and one-tap payment', 'Clear delivery fee before payment'],
    answers: {
      affected: 'Mobile shoppers, Customer service agents, Payment operations',
      pain: '68% of mobile users who reach checkout leave before paying; top complaints: forced registration and surprise delivery fees',
      metric: 'Checkout completion rate on mobile (baseline 32%, target 38%)',
      constraints: 'Must go live before the 12.12 sale; PCI-DSS for payments; no new payment provider this quarter',
      tried: 'Shortened the address form last year — small improvement only',
    },
  });
  const now = new Date().toISOString();
  p = { ...p, stories: generateStories(p) };
  for (const id of ['problem-statement', 'stakeholder-map', 'success-metrics', 'scope', 'requirements', 'tracking-plan', 'ux-brief', 'release-plan']) {
    const a = byId(id);
    const src = toSources(search(product, [p], `${p.intent} ${a.title} ${a.output} ${p.features.join(' ')}`, { k: 5, exclude: (c) => c.id === `intent:${p.id}` || c.kind === 'artefact' }));
    p = { ...p, artefacts: [...p.artefacts, { id: uid(), actionId: id, title: cleanTitle(a.title), phase: a.phase, content: GENERATORS[id](p) + sourcesMarkdown(src), sources: src, status: id === 'release-plan' || id === 'ux-brief' ? 'draft' : 'approved', createdAt: now, updatedAt: now, version: 1 }] };
  }
  p.stories = p.stories.map((s, i) => ({ ...s, status: i < 4 ? 'Done' : i < 6 ? 'In progress' : 'To do' }));
  const d = (n: number) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  p = {
    ...p,
    metrics: sampleMetrics(p),
    changelog: [
      { id: uid(), date: d(24), title: 'Guest checkout released to 5% pilot', type: 'release', rollout: 5 },
      { id: uid(), date: d(17), title: 'Rollout increased to 50%', type: 'change', rollout: 50 },
      { id: uid(), date: d(7), title: 'New delivery-fee banner (A/B test)', type: 'experiment', rollout: 50 },
    ],
  };
  return { product, projects: [p] };
}
