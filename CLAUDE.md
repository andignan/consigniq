# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ConsignIQ

ConsignIQ is an AI-powered consignment and estate sale management platform. It tracks consignors, their items, pricing, lifecycle status (active/grace/donation-eligible), and store/consignor revenue splits. Built for brick-and-mortar consignment shops with franchise support (multi-location, owner vs staff roles).

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- No test framework is configured yet

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

- **API routes** (`src/app/api/`) — RESTful endpoints for consignors, items, pricing (comps, suggest, identify). Use the server Supabase client, validate required fields, and attach `created_by` from the authenticated user.
- `/api/items` supports query params: `id`, `location_id`, `consignor_id`, `status`, `category`, `search`. Also supports `POST` (create), `PATCH` (update with auto-timestamps for sold/donated/priced).
- `/api/pricing/comps` — SerpApi eBay sold comp lookup
- `/api/pricing/suggest` — Claude AI pricing with optional photo (vision)
- `/api/pricing/identify` — Claude vision item identification from photos

### UserContext

`src/contexts/UserContext.tsx` provides `UserProvider` and `useUser()` hook. The dashboard layout wraps children in `<UserProvider>` with the authenticated user's profile (id, account_id, location_id, role, joined accounts/locations). Client components use `useUser()` to access location_id, role, etc.

### Type System

Two type files exist with overlapping but divergent definitions:
- `src/types/database.ts` — mirrors the Supabase schema closely, includes the `Database` generic interface
- `src/types/index.ts` — application-level types with UI helpers (`getLifecycleStatus`, `COLOR_CLASSES`, `ITEM_CATEGORIES`, `CONDITION_LABELS`). This is what most components import from `@/types`

Note: these files have some mismatches (e.g., field names like `split_pct_store` vs `split_store`, `grace_period_days` vs `grace_days`). The `types/index.ts` version reflects the actual app usage.

### Auth & Middleware

- Auth: Supabase email/password auth. Login at `/auth/login`.
- Dashboard layout (`src/app/dashboard/layout.tsx`) checks auth server-side, redirects to login if unauthenticated, loads user profile with joined account/location data, wraps children in `<Suspense>` (for `useSearchParams`) and `<UserProvider>`.
- Middleware (`middleware.ts`) protects both `/dashboard/:path*` (redirect to login) and `/api/:path*` (return 401 JSON). `/api/auth/*` is excluded from protection.

### Multi-tenancy Model

Data is scoped by `account_id` and `location_id`. Staff users see only their location's data (filtered by `location_id` from UserContext). Owner role users can see account-level rollups across all locations. RLS policies in Supabase handle row-level access control.

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
Full analytics page with time filter (7d/30d/90d/YTD/All Time), owner-role location toggle, 5 sections:
1. **Store Performance** — revenue, store earnings, consignor payouts, items sold/donated + Payout Report & Item Detail CSV exports
2. **Pricing Performance** — avg days to sell, avg sale price, sell-through rate, full price vs markdown breakdown
3. **Inventory Snapshot** — active consignors, pending/priced counts, inventory value, expiring items + Donation Report CSV export
4. **Activity Summary** — intake'd, priced, sold, donated, new consignors counts
5. **Consignor Report** — searchable consignor dropdown, summary card with lifecycle status (uses `getLifecycleStatus`), item breakdown stats, full item detail table with status/asking/sold/days/consignor cut columns, and Consignor Payout Slip CSV export

Uses browser Supabase client with client-side date filtering. All data fetched once per location change, filtered client-side by period.

### Sidebar (`/dashboard` layout)
Responsive sidebar: desktop always visible, mobile hamburger menu with overlay. Auto-closes on route change. Main content has `pt-14 md:pt-0` for mobile header offset.

## Critical Patterns

### fetch() calls must include `credentials: 'include'`
All client-side `fetch()` calls to `/api/` routes MUST include `credentials: 'include'` for mobile Safari to send session cookies through the middleware. This applies to every fetch in every client component.

### Supabase schema column names
Always audit actual column names before writing queries. Key fields:
- Consignors: `split_store`, `split_consignor` (integers, not `split_pct_*`)
- Items: `sold_date`, `donated_at`, `priced_at`, `intake_date`, `price`, `sold_price`, `current_markdown_pct`, `effective_price`
- Markdowns: `item_id`, `markdown_pct`, `original_price`, `new_price`, `applied_at`

### Never hardcode location_id
Always pull location from the user's session profile via UserContext (`useUser()`) or from the server-side profile query.

## Environment Variables

See `.env.example` for the full list. Key services: Supabase, Anthropic (AI pricing), SerpApi (eBay comps), Resend (email).
