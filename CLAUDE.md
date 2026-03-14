# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ConsignIQ

ConsignIQ is an AI-powered consignment and estate sale management platform. It tracks consignors, their items, pricing, lifecycle status (active/grace/donation-eligible), and store/consignor revenue splits. Built for brick-and-mortar consignment shops with franchise support (multi-location, owner vs staff roles).

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Jest test suite (58 tests across unit + API)
- `npm run test:watch` — Jest in watch mode

## Tech Stack

- **Next.js 14** (App Router, React 18, TypeScript, `src/` directory)
- **Supabase** for auth, database, and RLS — accessed via `@supabase/ssr`
- **Tailwind CSS 3** for styling (responsive: `md:` breakpoint for desktop)
- **lucide-react** for icons
- **Anthropic Claude API** (`@anthropic-ai/sdk`) for AI pricing and photo identification (vision)
- **SerpApi** for eBay sold comp lookups (engine: ebay, `LH_Sold=1`, `LH_Complete=1`)
- Path alias: `@/*` maps to `./src/*`

## Architecture

### Supabase Client Pattern

Two Supabase client factories, both reading from env vars:
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`), used in `'use client'` components
- `src/lib/supabase/server.ts` — server client (`createServerClient`), uses `cookies()` from `next/headers`. Used in Server Components and API routes. Exported as both `createServerClient` and `createClient`

### Data Layer

- **API routes** (`src/app/api/`) — RESTful endpoints for consignors, items, pricing (comps, suggest, identify), locations, settings. Use the server Supabase client, validate required fields, and attach `created_by` from the authenticated user.
- `/api/locations` — GET (list all account locations), POST (create new location, owner only)
- `/api/items` supports query params: `id`, `location_id`, `consignor_id`, `status`, `category`, `search`. Also supports `POST` (create), `PATCH` (update with auto-timestamps for sold/donated/priced).
- `/api/pricing/comps` — SerpApi eBay sold comp lookup
- `/api/pricing/suggest` — Claude AI pricing with optional photo (vision)
- `/api/pricing/identify` — Claude vision item identification from photos

### UserContext

`src/contexts/UserContext.tsx` provides `UserProvider` and `useUser()` hook. The dashboard layout wraps children in `<UserProvider>` with the authenticated user's profile (id, account_id, location_id, role, joined accounts/locations). Client components use `useUser()` to access account_id, role, etc.

### LocationContext (Multi-Location)

`src/contexts/LocationContext.tsx` provides `LocationProvider` and `useLocation()` hook. Manages the active location across the app:
- **Staff**: locked to their assigned `location_id`, cannot switch
- **Owner**: can switch between any location on their account + "All Locations" view
- Active location persists in `localStorage` (key: `consigniq_active_location`)
- When switching, updates both context state AND URL (`?location_id=xxx`) so server components also react
- Exposes: `activeLocationId` (null when "All Locations"), `activeLocationName`, `locations[]`, `isAllLocations`, `canSwitchLocations`, `setActiveLocation()`
- Dashboard layout loads all account locations and passes to LocationProvider
- Client components should use `useLocation().activeLocationId` instead of `useUser().location_id` for data queries

### Type System

Two type files exist with overlapping but divergent definitions:
- `src/types/database.ts` — mirrors the Supabase schema closely, includes the `Database` generic interface
- `src/types/index.ts` — application-level types with UI helpers (`getLifecycleStatus`, `COLOR_CLASSES`, `ITEM_CATEGORIES`, `CONDITION_LABELS`). This is what most components import from `@/types`

Note: these files have some mismatches (e.g., field names like `split_pct_store` vs `split_store`, `grace_period_days` vs `grace_days`). The `types/index.ts` version reflects the actual app usage.

### Auth & Middleware

- Auth: Supabase email/password auth. Login at `/auth/login`.
- Dashboard layout (`src/app/dashboard/layout.tsx`) checks auth server-side, redirects to login if unauthenticated, loads user profile with joined account/location data, loads all account locations, wraps children in `<Suspense>`, `<UserProvider>`, and `<LocationProvider>`.
- Middleware (`middleware.ts`) protects both `/dashboard/:path*` (redirect to login) and `/api/:path*` (return 401 JSON). `/api/auth/*` is excluded from protection.

### Multi-tenancy Model

Data is scoped by `account_id` and `location_id`. Staff users are locked to their assigned location (cannot switch). Owner users can switch between locations via the sidebar location switcher and see "All Locations" aggregate views. When "All Locations" is selected, queries use `account_id` instead of `location_id`. RLS policies in Supabase handle row-level access control.

### Consignor Lifecycle

Core domain concept: consignors go through intake_date -> expiry_date -> grace_end_date. The `getLifecycleStatus()` function in `src/types/index.ts` computes lifecycle state (days remaining, color coding, grace/donation eligibility) used throughout the UI.

### Category-Aware Pricing

12 item categories defined in `src/lib/pricing/categories.ts`, each with `searchTerms()`, `priceGuidance`, and `typicalMargin`. Used by both the eBay comps search and AI pricing prompt.

## Key Pages & Features

### Dashboard (`/dashboard`)
Server component. Shows stats (active consignors, pending items, inventory value, sold count), lifecycle alerts (expiring, grace, donation-eligible), quick actions.

### Consignors (`/dashboard/consignors`)
List, detail, and new consignor form. Intake form (`/dashboard/consignors/[id]/intake`) with multi-item queue and photo-based AI identification per row.

### Inventory (`/dashboard/inventory`)
Client component with status tabs, search, category filter, consignor filter dropdown, edit/sell/donate modals, CSV export. Filters persist in URL params.

### Pricing (`/dashboard/inventory/[id]/price` and `/dashboard/pricing`)
Two pricing UIs: inventory item pricing (for specific items) and price lookup (scratch pad). Both support:
- Photo upload with AI identification (Claude vision)
- "eBay Comps Only" and "Full AI Pricing" split buttons
- "Get AI Suggestion" escalation after comps-only
- Inline editing of item details (inventory pricing only)
- Manual price override with apply

### Reports (`/dashboard/reports`)
Full analytics page with time filter (7d/30d/90d/YTD/All Time), owner-role location toggle, 13 sections:
1. **Store Performance** — revenue, store earnings, consignor payouts, items sold/donated + Payout Report & Item Detail CSV exports
2. **Pricing Performance** — avg days to sell, avg sale price, sell-through rate, full price vs markdown breakdown
3. **Inventory Snapshot** — active consignors, pending/priced counts, inventory value, expiring items + Donation Report CSV export
4. **Activity Summary** — intake'd, priced, sold, donated, new consignors counts
5. **Consignor Report** — searchable consignor dropdown, summary card with lifecycle status, item breakdown, full item table, Consignor Payout Slip CSV
6. **Category Performance** — sortable table by category with items/sold/revenue/avg price/avg days/sell-through, CSV export
7. **Aging Inventory** — active items oldest-first, color-coded expiry (red ≤0d, amber ≤14d, green >14d), CSV export, capped at 50 rows in UI
8. **Consignor Performance Rankings** — sortable comparative table (items/sold/revenue/avg days/earned/sell-through), CSV export
9. **Weekly Operations Summary** — fixed 7-day window, week-over-week comparison with % change arrows, no CSV
10. **Markdown Effectiveness** — stat cards (markdown vs full-price sales/revenue/rate), breakdown table by markdown %, CSV export
11. **Pricing Accuracy (AI vs Actual)** — stat cards (within/above/below AI range), detail table with variance %, CSV export. Requires `low_price`/`high_price` on items
12. **Payout Reconciliation (All Time)** — all-time per-consignor ledger with total sold/share/paid(stubbed $0)/balance, totals footer, CSV export
13. **Donation & Tax Report** — donated items grouped by consignor with FMV (original asking price), subtotals, CSV export

Uses browser Supabase client with client-side date filtering. All data fetched once per location change, filtered client-side by period. Items query includes `ai_reasoning`, `current_markdown_pct`, `low_price`, `high_price`. Consignor join includes `intake_date`, `expiry_date`, `grace_end_date`.

### Settings (`/dashboard/settings`)
Three-tab settings page with role-based access:
- **Location Settings** (visible to owner + staff, only owner can edit): location name/address/city/state/phone, default split % (store + consignor, must add to 100 with live validation), agreement_days, grace_days, markdown_enabled toggle with hardcoded schedule display (Day 31 → 25% off, Day 46 → 50% off). Shows settings for the currently active location from LocationContext.
- **Locations** (owner only): list all locations on account with active badge, "Add Location" form with full settings (name, address, splits, agreement/grace days, markdown toggle). Click "Edit" to switch to that location's settings.
- **Account Settings** (owner only): account name (editable), tier badge (read-only), Manage Billing link (placeholder `/api/billing/portal`), team member list, invite user modal (email + role → writes to invitations table)

API routes: `/api/settings/location` (GET + PATCH), `/api/settings/account` (GET + PATCH), `/api/settings/invite` (POST), `/api/locations` (GET + POST). All enforce role checks — owner for edits, staff gets read-only location settings.

### Sidebar (`/dashboard` layout)
Responsive sidebar: desktop always visible, mobile hamburger menu with overlay. Auto-closes on route change. Main content has `pt-14 md:pt-0` for mobile header offset. Nav items: Dashboard, Consignors, Inventory, Price Lookup, Pending Items, Reports, Settings. Location switcher dropdown below brand (owners can switch locations, staff sees static location name). Mobile header shows active location name.

## Critical Patterns

### fetch() calls must include `credentials: 'include'`
All client-side `fetch()` calls to `/api/` routes MUST include `credentials: 'include'` for mobile Safari to send session cookies through the middleware. This applies to every fetch in every client component.

### Supabase schema column names
Always audit actual column names before writing queries. Key fields:
- Consignors: `split_store`, `split_consignor` (integers, not `split_pct_*`)
- Items: `sold_date`, `donated_at`, `priced_at`, `intake_date`, `price`, `sold_price`, `current_markdown_pct`, `effective_price`
- Markdowns: `item_id`, `markdown_pct`, `original_price`, `new_price`, `applied_at`
- Locations: `default_split_store`, `default_split_consignor`, `agreement_days`, `grace_days`, `markdown_enabled`
- Accounts: `id`, `name`, `tier`, `stripe_customer_id`, `status`
- Users: `id`, `account_id`, `location_id`, `email`, `full_name`, `role`
- Invitations: `id`, `account_id`, `email`, `role`, `token`, `created_at`, `expires_at`, `accepted_at`
- Price_history: `id`, `account_id`, `category`, `condition`, `created_at`, `days_to_sell`, `description`, `item_id`, `location_id`, `name`, `priced_at`, `sold`, `sold_at`, `sold_price` (added Phase 5)

### Never hardcode location_id
Client components: use `useLocation().activeLocationId` from LocationContext (not `useUser().location_id`).
Server components: read from `searchParams.location_id` (LocationContext updates the URL when switching).
API routes: read from request query params or body.

## Environment Variables

See `.env.example` for the full list. Key services: Supabase, Anthropic (AI pricing), SerpApi (eBay comps), Resend (email).

## Testing

Full test baseline established for Phases 1–5. Test suite: **58 tests, all passing**.

### Test Structure
```
__tests__/
├── unit/
│   ├── lifecycle.test.ts      — getLifecycleStatus(), CONDITION_LABELS, ITEM_CATEGORIES, COLOR_CLASSES
│   └── categories.test.ts     — getCategoryConfig(), search terms, fallback behavior
├── api/
│   ├── consignors.test.ts     — GET/POST validation, auth, location scoping
│   ├── items.test.ts          — GET/POST/PATCH, filters, auto-timestamps
│   ├── pricing.test.ts        — comps/identify/suggest validation, missing API keys
│   ├── settings.test.ts       — role enforcement (owner vs staff) across all settings endpoints
│   └── locations.test.ts      — GET/POST /api/locations, validation, role enforcement
```

### Manual Test Plans
Located at `/docs/test-plans/`. 14 test plans covering: authentication, consignor management, item intake, AI pricing engine, 60-day lifecycle, inventory management, markdown schedule, reporting & export, agreement emails (not yet implemented), settings page, dashboard home, multi-tenancy & data isolation, sidebar & navigation, multi-location support.

## Phase Status

Phase 5 is in progress. Completed so far:
- `sold_price` column added to `price_history` (migration at `supabase/migrations/20260314023405_add_sold_price_to_price_history.sql` — must be run via Supabase Dashboard SQL Editor)
- Settings page at `/dashboard/settings` with Location Settings, Locations, and Account Settings tabs
- Multi-location support: LocationContext, sidebar location switcher, owner cross-location dashboard, location management in settings, `/api/locations` route
- Full test baseline established (58 tests passing, 14 manual test plans)
- Timezone bugfix: `getLifecycleStatus()` now parses date strings as local time (appends `T00:00:00`)
- Next up: Repeat Item History
