# ConsignIQ Test Plans

Test baseline established for Phases 1–6. Each test plan covers happy paths, edge cases, role enforcement, mobile layout, and current automation status.

## Test Plans

| Test Plan | File | Scope | Automated Tests |
|-----------|------|-------|-----------------|
| [Authentication](./authentication.md) | `authentication.md` | Login, middleware, sessions, role access | API tests + Playwright E2E |
| [Consignor Management](./consignor-management.md) | `consignor-management.md` | CRUD, lifecycle badges, list/detail pages | API route tests |
| [Item Intake](./item-intake.md) | `item-intake.md` | IntakeQueue, photo AI, multi-item queue | API + pricing tests |
| [AI Pricing Engine](./ai-pricing-engine.md) | `ai-pricing-engine.md` | eBay comps, Claude pricing, photo ID, categories | API + unit tests |
| [60-Day Lifecycle](./60-day-lifecycle.md) | `60-day-lifecycle.md` | Lifecycle status, color coding, progress bars | Full unit tests |
| [Inventory Management](./inventory-management.md) | `inventory-management.md` | List, filters, edit/sell/donate, CSV export | API route tests |
| [Markdown Schedule](./markdown-schedule.md) | `markdown-schedule.md` | Markdown toggle, schedule display, report integration | Settings API tests |
| [Reporting & Export](./reporting-export.md) | `reporting-export.md` | 13 report sections, time filters, 11 CSV exports | None (client-side) |
| [Agreement Emails](./agreement-emails.md) | `agreement-emails.md` | Agreement PDF + email delivery | N/A (not implemented) |
| [Settings Page](./settings-page.md) | `settings-page.md` | Location/account settings, team mgmt, invites | API role tests |
| [Dashboard Home](./dashboard-home.md) | `dashboard-home.md` | Stats cards, lifecycle alerts, quick actions | None (server component) |
| [Multi-Tenancy](./multi-tenancy.md) | `multi-tenancy.md` | Account/location scoping, RLS, data isolation | API tests + Playwright E2E |
| [Sidebar & Navigation](./sidebar-navigation.md) | `sidebar-navigation.md` | Responsive sidebar, mobile menu, active states | Playwright E2E |
| [Multi-Location](./multi-location.md) | `multi-location.md` | Location switcher, cross-location dashboard, location management | API route tests |
| [Repeat Item History](./repeat-item-history.md) | `repeat-item-history.md` | Price history recording, "Priced Before" panel, similar items API | API route tests |
| [Admin Page](./admin-page.md) | `admin-page.md` | Superadmin dashboard, account management, tier/status changes | API tests + Playwright E2E |
| [Help System](./help-system.md) | `help-system.md` | Tooltips, floating help widget, AI search | API + unit + Playwright E2E |
| [AI Report Prompts](./ai-report-prompts.md) | `ai-report-prompts.md` | NL prompt bar, SQL generation, validation, execution | API route tests |
| [Label Printing](./label-printing.md) | `label-printing.md` | Single/bulk PDF labels, sizing, content | API route + Playwright E2E |
| [Stripe Billing](./stripe-billing.md) | `stripe-billing.md` | Checkout, portal, webhook, tier gates, usage tracking | API + unit tests |
| [Cross-Customer Pricing](./cross-customer-pricing.md) | `cross-customer-pricing.md` | Cross-account pricing intelligence, market panel, admin network stats | API route tests |

## Automated Test Suite

### Jest Tests (158 tests)
```
__tests__/
├── unit/
│   ├── lifecycle.test.ts      — getLifecycleStatus(), CONDITION_LABELS, ITEM_CATEGORIES, COLOR_CLASSES
│   ├── categories.test.ts     — getCategoryConfig(), search terms, fallback behavior
│   ├── help-components.test.ts — Knowledge base content, topic coverage
│   └── feature-gates.test.ts  — canUseFeature(), tier configs, feature mapping
├── api/
│   ├── consignors.test.ts     — GET/POST /api/consignors, validation, auth
│   ├── items.test.ts          — GET/POST/PATCH /api/items, filters, auto-timestamps
│   ├── pricing.test.ts        — /api/pricing/comps, /identify, /suggest validation
│   ├── settings.test.ts       — /api/settings/location, /account, /invite role enforcement
│   ├── locations.test.ts      — GET/POST /api/locations, validation, role enforcement
│   ├── price-history.test.ts  — GET /api/price-history, auth, validation, search
│   ├── admin.test.ts          — GET/PATCH /api/admin/stats + accounts, superadmin enforcement
│   ├── help.test.ts           — POST /api/help/search validation, AI scoping
│   ├── reports-query.test.ts  — POST /api/reports/query SQL validation, role scoping
│   ├── labels.test.ts         — POST /api/labels/generate validation, account scoping, PDF
│   ├── billing.test.ts        — POST /api/billing/checkout + portal, auth, role, Stripe
│   ├── billing-webhook.test.ts — POST /api/billing/webhook signature, tier updates
│   ├── cross-account-pricing.test.ts — GET /api/pricing/cross-account tier enforcement, matching
│   └── admin-network-stats.test.ts — GET /api/admin/network-stats superadmin enforcement
└── components/                — (placeholder for future component tests)
```

### Playwright E2E Tests (5 specs)
```
e2e/
├── auth.spec.ts           — Login page render, invalid credentials, valid login redirect
├── navigation.spec.ts     — 7 sidebar nav items, active state, mobile hamburger
├── data-isolation.spec.ts — /admin redirects non-superadmin, unauthenticated access blocked
├── help-widget.spec.ts    — Widget visible on /dashboard, opens on click, absent on /admin
└── labels.spec.ts         — Checkboxes on inventory, bulk action bar, print button on priced
```

**Note:** E2E tests require `npm run dev` running + seeded test data in Supabase. Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` env vars. Install browsers: `npx playwright install chromium`.

### Running Tests
```bash
npm test              # Run all Jest tests
npm run test:watch    # Jest in watch mode
npm run test:e2e      # Playwright E2E (requires running app + test data)
npm run test:e2e:ui   # Playwright with interactive UI
```

## Current Status

- **Unit tests**: Passing — lifecycle, categories, help knowledge base
- **API tests**: Passing — consignors, items, pricing, settings, locations, price-history, admin, help, reports-query, labels, cross-account-pricing, admin-network-stats
- **E2E tests**: Configured — 5 Playwright specs (auth, navigation, data-isolation, help-widget, labels)
- **Component tests**: Not yet implemented (would require more extensive mocking of Next.js rendering)

## Notes

- Agreement Emails feature is not yet implemented (type exists but no code)
- Community Pricing Feed is deferred to Phase 7+ — feature gate exists in `tier-limits.ts` (`community_pricing_feed`, Pro tier) but no API, UI, or implementation
- Reports page is purely client-side computation — testing requires component rendering tests or E2E
- Markdown automation (auto-applying markdowns) is not yet implemented; only the toggle and display exist
- All API tests mock the Supabase client to test route handler logic in isolation
- E2E tests will not run in CI without additional setup (test database seeding, environment variables)
- **Timestamp bugfix**: `price_history.priced_at` and `sold_at` were originally numeric columns but the items route wrote ISO strings. Migration `20260314050000` converts them to `timestamptz`. Regression test added in `items.test.ts`.
