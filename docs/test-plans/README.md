# ConsignIQ Test Plans

Test baseline established for Phases 1–4. Each test plan covers happy paths, edge cases, role enforcement, mobile layout, and current automation status.

## Test Plans

| Test Plan | File | Scope | Automated Tests |
|-----------|------|-------|-----------------|
| [Authentication](./authentication.md) | `authentication.md` | Login, middleware, sessions, role access | Indirect (API tests) |
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
| [Multi-Tenancy](./multi-tenancy.md) | `multi-tenancy.md` | Account/location scoping, RLS, data isolation | Indirect (API auth tests) |
| [Sidebar & Navigation](./sidebar-navigation.md) | `sidebar-navigation.md` | Responsive sidebar, mobile menu, active states | None (client component) |
| [Multi-Location](./multi-location.md) | `multi-location.md` | Location switcher, cross-location dashboard, location management | API route tests |
| [Repeat Item History](./repeat-item-history.md) | `repeat-item-history.md` | Price history recording, "Priced Before" panel, similar items API | API route tests |
| [Admin Page](./admin-page.md) | `admin-page.md` | Superadmin dashboard, account management, tier/status changes | API route tests |
| [Help System](./help-system.md) | `help-system.md` | Tooltips, floating help widget, AI search | API + unit tests |
| [AI Report Prompts](./ai-report-prompts.md) | `ai-report-prompts.md` | NL prompt bar, SQL generation, validation, execution | API route tests |

## Automated Test Suite

### Structure
```
__tests__/
├── unit/
│   ├── lifecycle.test.ts      — getLifecycleStatus(), CONDITION_LABELS, ITEM_CATEGORIES, COLOR_CLASSES
│   └── categories.test.ts     — getCategoryConfig(), search terms, fallback behavior
├── api/
│   ├── consignors.test.ts     — GET/POST /api/consignors, validation, auth
│   ├── items.test.ts          — GET/POST/PATCH /api/items, filters, auto-timestamps
│   ├── pricing.test.ts        — /api/pricing/comps, /identify, /suggest validation
│   ├── settings.test.ts       — /api/settings/location, /account, /invite role enforcement
│   ├── locations.test.ts      — GET/POST /api/locations, validation, role enforcement
│   ├── price-history.test.ts  — GET /api/price-history, auth, validation, search
│   ├── admin.test.ts          — GET/PATCH /api/admin/stats + accounts, superadmin enforcement
│   ├── help.test.ts           — POST /api/help/search validation, AI scoping
│   └── reports-query.test.ts  — POST /api/reports/query SQL validation, role scoping
├── unit/
│   └── help-components.test.ts — Knowledge base content, topic coverage
└── components/                — (placeholder for future component tests)
```

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
```

## Current Status

- **Unit tests**: Passing — lifecycle, categories
- **API tests**: Passing — consignors, items, pricing, settings
- **Component tests**: Not yet implemented (would require more extensive mocking of Next.js rendering)
- **E2E tests**: Not yet implemented (would require Playwright or Cypress)

## Notes

- Agreement Emails feature is not yet implemented (type exists but no code)
- Reports page is purely client-side computation — testing requires component rendering tests or E2E
- Markdown automation (auto-applying markdowns) is not yet implemented; only the toggle and display exist
- All API tests mock the Supabase client to test route handler logic in isolation
