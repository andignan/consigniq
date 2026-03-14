# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ConsignIQ

ConsignIQ is an AI-powered consignment and estate sale management platform. It tracks consignors, their items, pricing, lifecycle status (active/grace/donation-eligible), and store/consignor revenue splits. Built for brick-and-mortar consignment shops with franchise support (multi-location, owner vs staff roles).

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Jest test suite (245 tests across unit + API)
- `npm run test:watch` — Jest in watch mode
- `npm run test:e2e` — Playwright E2E tests (requires `npm run dev` + seeded test data)
- `npm run test:e2e:ui` — Playwright E2E with interactive UI

## Tech Stack

- **Playwright** for E2E browser testing (chromium)
- **Next.js 14** (App Router, React 18, TypeScript, `src/` directory)
- **Supabase** for auth, database, and RLS — accessed via `@supabase/ssr`
- **Tailwind CSS 3** for styling (responsive: `md:` breakpoint for desktop)
- **lucide-react** for icons
- **Anthropic Claude API** (`@anthropic-ai/sdk`) for AI pricing and photo identification (vision)
- **SerpApi** for eBay sold comp lookups (engine: ebay, `LH_Sold=1`, `LH_Complete=1`, `LH_ItemCondition=3000` for pre-owned only)
- **pdf-lib** for PDF label generation (no browser dependency)
- **Stripe** (`stripe`) for subscription billing and payment processing
- **Resend** (`resend`) for transactional email (agreement emails, expiry notifications)
- Path alias: `@/*` maps to `./src/*`

## Architecture

### Supabase Client Pattern

Three Supabase client factories:
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`), used in `'use client'` components
- `src/lib/supabase/server.ts` — server client (`createServerClient`), uses `cookies()` from `next/headers`. Used in Server Components and API routes. Exported as both `createServerClient` and `createClient`
- `src/lib/supabase/admin.ts` — service role client (`createAdminClient`), bypasses RLS. Used only in admin routes and superadmin checks. Also exports `checkSuperadmin()` helper that authenticates via the regular client then verifies `is_superadmin` via service role (needed because superadmin users may not satisfy RLS policies on the users table)

### Data Layer

- **API routes** (`src/app/api/`) — RESTful endpoints for consignors, items, pricing (comps, suggest, identify), locations, settings. Use the server Supabase client, validate required fields, and attach `created_by` from the authenticated user.
- `/api/locations` — GET (list all account locations), POST (create new location, owner only)
- `/api/items` supports query params: `id`, `location_id`, `consignor_id`, `status`, `category`, `search`. Also supports `POST` (create), `PATCH` (update with auto-timestamps for sold/donated/priced). PATCH with `status: 'sold'` also writes a `price_history` record automatically.
- `/api/price-history` — GET similar sold items from `price_history` table. Requires `category` param, optional `name` (ilike search), `exclude_item_id`, `limit` (max 50, default 10). Falls back to broader category search if name search returns few results.
- `/api/admin/stats` — GET cross-account platform stats (accounts by tier/status, locations, users, items by status, consignors by status). Superadmin only.
- `/api/admin/accounts` — GET list/detail accounts with location/user counts. PATCH to update tier (solo/starter/standard/pro), status (active/suspended/cancelled/inactive), account_type, is_complimentary, complimentary_tier, extend_trial. Superadmin only. Supports `?id=`, `?tier=`, `?status=` filters.
- `/api/admin/users` — GET list all users across accounts with account join. Supports `?search=`, `?account_type=`, `?tier=` filters. POST creates a new user with account, location, auth user, and users table row. Superadmin only.
- `/api/help/search` — POST AI-powered help search. Takes `{ question: string }`, calls Claude with the help knowledge base as system context. Returns `{ answer: string }`. Scoped to ConsignIQ questions only.
- `/api/reports/query` — POST natural-language report queries. Takes `{ question, location_id? }`. Uses Claude to generate read-only SQL, validates (SELECT-only, account_id scoping, forbidden tables blocked), executes via Supabase RPC `execute_readonly_query`, generates AI summary. Allowed tables: items, consignors, price_history, locations, markdowns. Forbidden: users, accounts, invitations, agreements. Staff users auto-scoped to their location.
- `/api/labels/generate` — POST PDF label generation. Takes `{ item_ids: string[], size: '2x1' | '4x2' }`. Fetches items with consignor/location joins, scoped by account_id. Returns PDF blob. Labels include item name (2-line max), category, condition, price (with strikethrough for markdowns), consignor (first name + last initial), location, short item ID, ConsignIQ branding.
- `/api/billing/checkout` — POST creates Stripe Checkout session. Takes `{ tier: 'solo' | 'starter' | 'standard' | 'pro' }` for subscriptions or `{ product: 'topup_50' }` for one-time 50-lookup top-up. Creates Stripe customer if needed. Owner only. Returns `{ url }` to redirect. Gracefully handles missing Stripe keys (returns 503).
- `/api/billing/portal` — POST creates Stripe Customer Portal session. Requires existing stripe_customer_id. Owner only. Returns `{ url }`.
- `/api/billing/webhook` — POST Stripe webhook handler. Excluded from auth middleware. Handles: `checkout.session.completed` (update tier, handle topup_50 bonus lookups, convert trial→paid), `customer.subscription.updated` (sync tier), `customer.subscription.deleted` (downgrade to starter), `invoice.payment_failed` (log warning only).
- `/api/trial/check-expiry` — POST cron endpoint. Finds trials expiring in 1 day and sends reminder emails. Reports expired trial counts. Auth via `Authorization: Bearer CRON_SECRET` header. Excluded from middleware auth.
- `/api/pricing/comps` — SerpApi eBay sold comp lookup. Filters: sold listings only (`LH_Sold=1`, `LH_Complete=1`), pre-owned condition only (`LH_ItemCondition=3000`). Also client-side filters out any remaining new-condition results (Brand New, New with tags, etc.).
- `/api/pricing/suggest` — Claude AI pricing with optional photo (vision)
- `/api/pricing/identify` — Claude vision item identification from photos
- `/api/pricing/cross-account` — Cross-account pricing intelligence (Pro-tier only). Three-level match: exact name+category+condition → fuzzy name+category → category fallback. Requires ≥3 samples. Optional Claude insight text.
- `/api/payouts` — GET consignor payout data (sold items grouped by consignor with split calculations). Supports `location_id`, `status` (`unpaid`/`paid`/`all`) filters. PATCH marks items as paid (takes `item_ids[]`, optional `payout_note`).
- `/api/agreements/send` — POST sends consignment agreement email. Takes `{ consignor_id }`. Fetches consignor + items + location, creates `agreements` record, sends email via Resend, updates `email_sent_at`. Returns 400 if no email on consignor.
- `/api/agreements/notify-expiring` — POST finds consignors with `expiry_date` = today + 3 days, skips already-notified ones, sends reminder emails. Designed for cron job invocation. Returns `{ sent, skipped, errors? }`.
- `/api/auth/check-superadmin` — GET returns `{ is_superadmin: boolean }`. Uses service role to bypass RLS. Called by login page to determine redirect destination. Excluded from middleware auth protection (under `/api/auth/*`).

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
- Middleware (`middleware.ts`) protects `/dashboard/:path*`, `/admin/:path*` (redirect to login), and `/api/:path*` (return 401 JSON). `/api/auth/*`, `/api/billing/webhook`, and `/api/trial/*` are excluded from protection.
- Post-login redirect: login page calls `/api/auth/check-superadmin` after successful auth — superadmins go to `/admin`, regular users go to `/dashboard`.

### Superadmin Access

- The `is_superadmin` boolean on the `users` table gates access to `/admin` routes
- Admin layout (`src/app/admin/layout.tsx`) checks `is_superadmin` server-side using service role client (bypasses RLS); non-superadmins redirect to `/dashboard`
- Admin API routes (`/api/admin/stats`, `/api/admin/accounts`, `/api/admin/network-stats`) use `checkSuperadmin()` from `@/lib/supabase/admin` and `createAdminClient()` for all queries — return 403 for non-superadmins
- All admin queries are cross-account (no `account_id` scoping) — superadmin sees all data
- Admin has its own sidebar with red/Shield branding, separate from the dashboard sidebar. No "Back to App" link — superadmins live in `/admin` only
- **Login redirect**: after successful login, `/api/auth/check-superadmin` is called (uses service role to bypass RLS). If `is_superadmin` is true, user is redirected to `/admin` instead of `/dashboard`
- **Important**: all superadmin checks must use the service role client because the superadmin user may not have an `account_id` that satisfies RLS policies on the users table

### Stripe Billing & Tier Enforcement

Four tiers: `solo` ($9/mo, 200 AI lookups/mo, pricing-only), `starter` ($49/mo, unlimited AI, full shop), `standard` ($79/mo, markdowns/repeat history), `pro` ($129/mo, all features).

- **Tier limits** defined in `src/lib/tier-limits.ts` — `TIER_CONFIGS`, `FEATURE_REQUIRED_TIER`, `FEATURE_LABELS`
- **Feature gates** in `src/lib/feature-gates.ts` — `canUseFeature(tier, feature)`, `getUpgradeMessage(feature)`
- **Stripe client** singleton in `src/lib/stripe.ts` — `getStripe()`
- **UpgradePrompt** component (`src/components/UpgradePrompt.tsx`) — shown in place of locked features with "Upgrade to [tier]" CTA
- **AI pricing usage tracking**: `accounts.ai_lookups_this_month` + `accounts.ai_lookups_reset_at` columns. Checked in `/api/pricing/suggest` — starter tier limited to 50/month, counter resets after 30 days. Incremented via `increment_ai_lookups` RPC.
- **Webhook** at `/api/billing/webhook` — excluded from auth middleware, uses service role Supabase client, verifies Stripe signature
- **Feature gating in UI**: "Priced Before" panel (standard+), markdown schedules (standard+), cross-customer pricing (pro), community feed (pro), "All Locations" (pro), consignor management (starter+), payouts (starter+), reports (starter+)
- **Bonus lookups**: Solo/starter accounts can purchase 50-lookup top-up packs ($5). Tracked via `accounts.bonus_lookups` (purchased) and `accounts.bonus_lookups_used` (consumed). Monthly reset clears `ai_lookups_this_month` only; bonus lookups persist until used.
- **Settings billing UI**: usage meter for starter, pricing cards for upgrade, "Manage Billing" button for paid tiers via Stripe Portal

### Account Type System

Three account types tracked via `accounts.account_type`:
- **paid** (default): Normal paying customers. Tier determines features.
- **trial**: 30-day free trial. Full access to assigned tier until `trial_ends_at`. After expiry, locked out with full-screen upgrade page. Cron at `/api/trial/check-expiry` sends reminder 1 day before expiry.
- **complimentary**: Free forever. `is_complimentary = true`, `complimentary_tier` overrides the account's tier for feature access checks.

Key functions in `src/lib/feature-gates.ts`:
- `isAccountActive(account)` — true if paid, complimentary, or trial not expired. False if suspended/cancelled.
- `getEffectiveTier(account)` — returns `complimentary_tier` for complimentary accounts, otherwise `account.tier`.
- `canAccountUseFeature(account, feature)` — combines active check + tier check.
- `isLookupLimitReached(tier, usedThisMonth, bonusLookups, bonusUsed)` — checks total usage vs total capacity.

### Solo Pricer Tier

Solo ($9/mo, 200 AI lookups/mo) is a simplified pricing-only experience:
- **Features**: AI pricing, price lookup, save to inventory, CSV export, photo identification
- **Blocked**: consignor management, lifecycle, payouts, agreements, multi-location, staff, reports, repeat item history, markdowns
- **Sidebar**: Dashboard, Price Lookup, My Inventory, Settings (billing only). Upgrade CTA in footer.
- **Dashboard**: Usage meter (green/yellow/red), "Buy 50 more — $5" button, "Price an Item" quick action, upgrade CTA card
- **Inventory**: Items saved without `consignor_id` (nullable). Mark as Sold, Archive actions.
- **Settings**: Billing tab only. Current plan, lookups remaining, reset date, buy more button, Stripe portal.
- Component: `src/components/SoloDashboard.tsx` (client component, rendered when tier is 'solo')

### Trial Account Experience

- **TrialBanner** (`src/components/TrialBanner.tsx`): Shown on all dashboard pages for trial accounts. Days remaining with color coding (green >14, yellow 7-14, orange <7). Links to upgrade.
- **TrialExpiredPage** (`src/components/TrialExpiredPage.tsx`): Full-screen lockout showing all tier options with Stripe checkout links. Dashboard layout renders this when `trial_ends_at` has passed.
- **Expiry cron**: `/api/trial/check-expiry` — finds trials expiring tomorrow, sends reminder emails to account owners. Auth: `Authorization: Bearer CRON_SECRET` or open if no CRON_SECRET set.

### Multi-tenancy Model

Data is scoped by `account_id` and `location_id`. Staff users are locked to their assigned location (cannot switch). Owner users can switch between locations via the sidebar location switcher and see "All Locations" aggregate views. When "All Locations" is selected, queries use `account_id` instead of `location_id`. RLS policies in Supabase handle row-level access control.

### Consignor Lifecycle

Core domain concept: consignors go through intake_date -> expiry_date -> grace_end_date. The `getLifecycleStatus()` function in `src/types/index.ts` computes lifecycle state (days remaining, color coding, grace/donation eligibility) used throughout the UI.

### Email Infrastructure

- `src/lib/email.ts` — `sendEmail({ to, subject, text, html })` wrapper around Resend SDK. From address: `ConsignIQ <${RESEND_FROM_EMAIL}>` (defaults to `noreply@consigniq.com`).
- `src/lib/email-templates.ts` — `buildAgreementEmail()` and `buildExpiryReminderEmail()`. Both return `{ subject, text, html }` (dual plain-text + HTML). Agreement email includes: store header, consignor greeting, agreement details (dates, splits), items table (name/category/condition — NO prices ever shown to consignor), "How It Works" section, pickup instructions, contact info. Expiry reminder includes: store name, expiry date, grace end date, store phone.
- `src/components/AgreementButton.tsx` — client component with "Send Agreement"/"Resend Agreement" button, confirmation modal, success/error handling, last-sent date display.
- `src/components/IntakeAgreementPrompt.tsx` — client component showing amber prompt "Ready to send the agreement email?" with Send/Skip buttons after intake completion.
- Agreements table: `account_id`, `consignor_id`, `generated_at`, `expiry_date`, `grace_end`, `email_sent_at`.

### Category-Aware Pricing

12 item categories defined in `src/lib/pricing/categories.ts`, each with `searchTerms()`, `priceGuidance`, and `typicalMargin`. Used by both the eBay comps search and AI pricing prompt.

## Key Pages & Features

### Dashboard (`/dashboard`)
Server component. Shows stats (active consignors, pending items, inventory value, sold count), lifecycle alerts (expiring, grace, donation-eligible), quick actions.

### Consignors (`/dashboard/consignors`)
List, detail, and new consignor form. Detail page shows lifecycle progress bar, item stats, agreement button (Send/Resend with last-sent date), and post-intake agreement prompt. Intake form (`/dashboard/consignors/[id]/intake`) with multi-item queue and photo-based AI identification per row.

### Inventory (`/dashboard/inventory`)
Client component with status tabs, search, category filter, consignor filter dropdown, edit/sell/donate modals, CSV export. Filters persist in URL params. Checkboxes on each item for bulk selection; bulk action bar with label size picker and "Print Labels" button. Individual "Print" button on priced items.

### Pricing (`/dashboard/inventory/[id]/price` and `/dashboard/pricing`)
Two pricing UIs: inventory item pricing (for specific items) and price lookup (scratch pad). Both support:
- Photo upload with AI identification (Claude vision)
- "eBay Comps Only" and "Full AI Pricing" split buttons
- "Get AI Suggestion" escalation after comps-only
- Inline editing of item details (inventory pricing only)
- Manual price override with apply
- Item name auto-capitalize on blur (first letter of each word capitalized when user leaves the field)
- Category-specific description hints for high-variance categories (China & Crystal, Jewelry & Silver, Collectibles & Art, Furniture, Electronics, Clothing & Shoes) — shown below description field when description is empty or under 20 chars
- "Priced Before" panel (inventory pricing only) — shows similar previously-sold items from `price_history` with avg sold price and avg days to sell
- "Market Intelligence" panel (inventory pricing only, Pro tier) — cross-account pricing data from the entire ConsignIQ network with avg/median/range/days stats and optional AI insight text. Three-level matching: exact → fuzzy → category fallback. Shows UpgradePrompt for non-Pro tiers.

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

**AI Report Prompt Bar** — natural language query bar at top of Reports page. User types a question, Claude generates read-only SQL, validated for safety (SELECT-only, account_id scoping, no forbidden tables), executed via Supabase RPC, results displayed in data table with AI summary. 6 suggested prompt chips for common queries. Staff auto-scoped to their location. Requires `execute_readonly_query` RPC function in Supabase.

### Settings (`/dashboard/settings`)
Three-tab settings page with role-based access:
- **Location Settings** (visible to owner + staff, only owner can edit): location name/address/city/state/phone, default split % (store + consignor, must add to 100 with live validation), agreement_days, grace_days, markdown_enabled toggle with hardcoded schedule display (Day 31 → 25% off, Day 46 → 50% off). Shows settings for the currently active location from LocationContext.
- **Locations** (owner only): list all locations on account with active badge, "Add Location" form with full settings (name, address, splits, agreement/grace days, markdown toggle). Click "Edit" to switch to that location's settings.
- **Account Settings** (owner only): account name (editable), tier badge (read-only), Manage Billing link (placeholder `/api/billing/portal`), team member list, invite user modal (email + role → writes to invitations table)

API routes: `/api/settings/location` (GET + PATCH), `/api/settings/account` (GET + PATCH), `/api/settings/invite` (POST), `/api/locations` (GET + POST). All enforce role checks — owner for edits, staff gets read-only location settings.

### Payouts (`/dashboard/payouts`)
Client component. Shows consignors with sold items, split calculations (store/consignor shares), Mark as Paid functionality, filter tabs (Unpaid/Paid/All), CSV export. Summary cards: Total Owed, Total Paid Out, Consignors with Balance. Expandable consignor rows with item checkboxes for bulk "Mark as Paid" with optional payout note.

### Sidebar (`/dashboard` layout)
Responsive sidebar: desktop always visible, mobile hamburger menu with overlay. Auto-closes on route change. Main content has `pt-14 md:pt-0` for mobile header offset. **Tier-aware navigation**: Solo users see simplified nav (Dashboard, Price Lookup, My Inventory, Settings) with "Solo Pricer" subtitle and upgrade CTA in footer. Full tiers see: Dashboard, Consignors, Inventory, Price Lookup, Reports, Payouts, Settings. Consignors nav item shows amber badge with count of consignors expiring within 7 days or in grace period (scoped by active location). Location switcher dropdown below brand (owners can switch locations, staff sees static location name, hidden for solo). Mobile header shows active location name. User display at bottom shows `full_name` with fallback to `email` if name is null/empty/whitespace.

### Admin (`/admin`) — Superadmin Only
Platform administration for `admin@getconsigniq.com`. Separate layout with own sidebar (red/Shield branding).
- **Overview** (`/admin`): Cross-account stats — accounts by tier/status, total locations/users/items/consignors with breakdowns. Network Pricing Intelligence card: total records, sold items, sell-through %, avg days to sell, top 5 categories.
- **Users** (`/admin/users`): Cross-account user management. Search by email/name, filter by account_type and tier. Add User modal creates account + location + auth user + users row. Account type badges (Paid/Trial/Complimentary) with days remaining for trials.
- **Accounts** (`/admin/accounts`): Filterable table (tier, status) of all accounts with location/user counts. Click row for detail.
- **Account Detail** (`/admin/accounts/[id]`): Tier change dropdown (incl. solo), status toggle (incl. inactive), account_type badge, trial_ends_at display. Action buttons: Extend Trial (+30d), Convert to Complimentary, Convert to Paid, Disable/Enable Account. Locations list, users list with roles, item counts by status.

### Help System (Three Layers)

**Layer 1 — Tooltips**: Reusable `Tooltip` component (`src/components/Tooltip.tsx`) with `?` icon that shows content on hover/click. Used on settings fields (split %, agreement days, grace days, markdown toggle), pricing page (AI range), and consignor card (donate badge). Usage: `<Tooltip content="Explanation text" />`.

**Layer 2 — Floating Help Widget**: `HelpWidget` component (`src/components/HelpWidget.tsx`) renders a persistent `?` button on all `/dashboard` pages (excluded from `/admin`). Opens a panel with search box and 9 quick links across 3 sections (Getting Started, Pricing Help, Account & Settings). Quick links expand/collapse inline answers. Mobile: full-screen panel.

**Layer 3 — AI Help Search**: When user types in the widget search box, calls `/api/help/search` which sends the question to Claude with the help knowledge base (`src/lib/help-knowledge-base.ts`) as system context. Response shown in the widget with "Powered by AI" label. System prompt scopes answers to ConsignIQ only.

## Critical Patterns

### fetch() calls must include `credentials: 'include'`
All client-side `fetch()` calls to `/api/` routes MUST include `credentials: 'include'` for mobile Safari to send session cookies through the middleware. This applies to every fetch in every client component.

### Supabase schema column names
Always audit actual column names before writing queries. Key fields:
- Consignors: `split_store`, `split_consignor` (integers, not `split_pct_*`)
- Items: `sold_date`, `donated_at`, `priced_at`, `intake_date`, `price`, `sold_price`, `current_markdown_pct`, `effective_price`, `paid_at` (timestamptz, nullable), `payout_note` (text, nullable)
- Markdowns: `item_id`, `markdown_pct`, `original_price`, `new_price`, `applied_at`
- Locations: `default_split_store`, `default_split_consignor`, `agreement_days`, `grace_days`, `markdown_enabled`
- Accounts: `id`, `name`, `tier` (solo/starter/standard/pro), `stripe_customer_id`, `status`, `ai_lookups_this_month`, `ai_lookups_reset_at`, `account_type` (paid/trial/complimentary), `trial_ends_at` (timestamptz), `is_complimentary` (boolean), `complimentary_tier` (text), `bonus_lookups` (integer), `bonus_lookups_used` (integer)
- Users: `id`, `account_id`, `location_id`, `email`, `full_name`, `role`, `is_superadmin`
- Invitations: `id`, `account_id`, `email`, `role`, `token`, `created_at`, `expires_at`, `accepted_at`
- Price_history: `id`, `account_id`, `category`, `condition`, `created_at`, `days_to_sell`, `description`, `item_id`, `location_id` (NOT NULL), `name`, `priced_at` (timestamptz, NOT NULL), `sold`, `sold_at` (timestamptz, nullable), `sold_price` (added Phase 5). Note: `priced_at` and `sold_at` were originally numeric columns; migration `20260314050000` converts them to `timestamptz` to match what the items route writes (ISO strings).
- Agreements: `id`, `account_id`, `consignor_id`, `generated_at`, `expiry_date`, `grace_end`, `email_sent_at`

### Never hardcode location_id
Client components: use `useLocation().activeLocationId` from LocationContext (not `useUser().location_id`).
Server components: read from `searchParams.location_id` (LocationContext updates the URL when switching).
API routes: read from request query params or body.

## Environment Variables

See `.env.example` for the full list. Key services: Supabase, Anthropic (AI pricing), SerpApi (eBay comps), Resend (email), Stripe (billing). Additional: `STRIPE_SOLO_PRICE_ID`, `STRIPE_TOPUP_50_PRICE_ID`, `CRON_SECRET` (for trial expiry cron auth). See `DEPLOYMENT.md` for Vercel deployment instructions and env var reference.

## Testing

Full test baseline established for Phases 1–6 + sidebar improvements + agreement emails + solo tier + admin user management. Test suite: **245 tests, all passing**.

### Test Count History
- **Phase 5 complete**: 116 tests (unit: lifecycle 13, categories 5 = 18; api: consignors 7, items 15, pricing 6, settings 7, locations 8, price-history 10, admin 15, help 6, reports-query 12, labels 8 = 94; total = 18 + 94 + 4 help-components = 116)
- **Phase 6 additions** (+40): feature-gates 14, billing 8, billing-webhook 5, cross-account-pricing 9, admin-network-stats 4 = 156
- **Timestamp regression** (+2): items.test.ts +1 (priced_at/sold_at ISO string regression), cross-account-pricing.test.ts +1 (view shape validation) = 158
- **Sidebar improvements** (+12): payouts.test.ts 12 (GET auth/404/empty/splits/location filter/unpaid filter/paid filter, PATCH auth/400 missing/400 empty/mark with note/mark without note) = 170
- **eBay comps fix + auto-capitalize** (+10): pricing.test.ts +2 (SerpApi params, new-condition filtering), auto-capitalize.test.ts 8 (word capitalization, edge cases) = 180
- **Description hints** (+12): description-hints.test.ts 12 (per-category hints, threshold, no-hint categories) = 192
- **Agreement emails** (+11): agreements.test.ts 11 (send auth/validation/creation/email-sent-at, agreement template content/missing phone, expiry reminder template, notify-expiring auth/empty/query) = 203
- **Solo tier + admin users** (+42): feature-gates.test.ts +28 (solo feature blocking, account type helpers, lookup limits, complimentary bypass, trial active/expired), admin-users.test.ts 10 (GET auth/search/list, POST auth/validation/create/complimentary), trial-check-expiry.test.ts 4 (auth/reminder/expired count) = 245

### Test Structure
```
__tests__/
├── unit/
│   ├── lifecycle.test.ts      — getLifecycleStatus(), CONDITION_LABELS, ITEM_CATEGORIES, COLOR_CLASSES
│   ├── categories.test.ts     — getCategoryConfig(), search terms, fallback behavior
│   ├── help-components.test.ts — Knowledge base content and topic coverage
│   ├── feature-gates.test.ts  — canUseFeature(), getUpgradeMessage(), tier configs, feature mapping, isAccountActive(), getEffectiveTier(), canAccountUseFeature(), isLookupLimitReached()
│   ├── auto-capitalize.test.ts — Item name auto-capitalize on blur behavior
│   └── description-hints.test.ts — Category-specific description hints, threshold, coverage
├── api/
│   ├── consignors.test.ts     — GET/POST validation, auth, location scoping
│   ├── items.test.ts          — GET/POST/PATCH, filters, auto-timestamps, price_history writes, timestamp type regression
│   ├── pricing.test.ts        — comps/identify/suggest validation, missing API keys, sold/pre-owned filters, new-condition exclusion
│   ├── settings.test.ts       — role enforcement (owner vs staff) across all settings endpoints
│   ├── locations.test.ts      — GET/POST /api/locations, validation, role enforcement
│   ├── price-history.test.ts  — GET /api/price-history, auth, validation, search
│   ├── admin.test.ts          — GET/PATCH /api/admin/stats + accounts, superadmin enforcement
│   ├── help.test.ts           — POST /api/help/search validation, AI scoping, knowledge base
│   ├── reports-query.test.ts  — POST /api/reports/query SQL validation, role scoping, security
│   ├── labels.test.ts         — POST /api/labels/generate validation, account scoping, PDF output
│   ├── billing.test.ts        — POST /api/billing/checkout + portal, auth, role, Stripe session
│   ├── billing-webhook.test.ts — POST /api/billing/webhook signature, tier updates, downgrade
│   ├── cross-account-pricing.test.ts — GET /api/pricing/cross-account tier enforcement, matching
│   ├── admin-network-stats.test.ts — GET /api/admin/network-stats superadmin enforcement
│   ├── payouts.test.ts         — GET/PATCH /api/payouts, auth, filters, split calcs, mark as paid
│   ├── agreements.test.ts      — POST /api/agreements/send + notify-expiring, auth, validation, email templates
│   ├── admin-users.test.ts     — GET/POST /api/admin/users, superadmin enforcement, search, create account/user/location
│   └── trial-check-expiry.test.ts — POST /api/trial/check-expiry, auth, reminder emails, expired count
```

### Playwright E2E Tests
```
e2e/
├── auth.spec.ts           — Login page render, invalid credentials, valid login redirect
├── navigation.spec.ts     — 7 sidebar nav items, active state, mobile hamburger
├── data-isolation.spec.ts — /admin redirects non-superadmin, unauthenticated access blocked
├── help-widget.spec.ts    — Widget visible on /dashboard, opens on click, absent on /admin
└── labels.spec.ts         — Checkboxes on inventory, bulk action bar, print button on priced items
```

**Important:** E2E tests require a running dev server (`npm run dev`) and seeded test data in Supabase. They will not run in CI without additional setup (test database seeding, environment variables). Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` env vars for auth tests. Install browsers with `npx playwright install chromium`.

### Manual Test Plans
Located at `/docs/test-plans/`. 25 test plans covering: authentication, consignor management, item intake, AI pricing engine, 60-day lifecycle, inventory management, markdown schedule, reporting & export, agreement emails, settings page, dashboard home, multi-tenancy & data isolation, sidebar & navigation, multi-location support, repeat item history, admin page, help system, AI report prompts, label printing, Stripe billing, cross-customer pricing, payouts.

## Phase Status

**Phase 5 — COMPLETE.** All features implemented, tested, and documented.

### Phase 5 Feature List (Done)
- Settings page at `/dashboard/settings` (Location Settings, Locations, Account Settings tabs)
- Multi-location support (LocationContext, sidebar switcher, owner cross-location dashboard, `/api/locations`)
- Repeat Item History (price_history auto-write on sold, `/api/price-history`, "Priced Before" panel)
- Admin Page (superadmin `/admin` route: overview stats, accounts list, account detail with tier/status)
- Help System (tooltips, floating widget, AI search via `/api/help/search` + knowledge base)
- AI Report Prompts (natural language query bar, Claude-generated SQL, `/api/reports/query`)
- Label Printing (PDF via pdf-lib, single/bulk print, 2 sizes, `/api/labels/generate`)
- Playwright E2E test setup (5 specs: auth, navigation, data-isolation, help-widget, labels)
- `sold_price` column on `price_history` (migration at `supabase/migrations/20260314023405_add_sold_price_to_price_history.sql`)
- Timezone bugfix: `getLifecycleStatus()` parses date strings as local time (appends `T00:00:00`)
- Test suite: **116 Jest tests passing**, 5 Playwright E2E specs, 19 manual test plans

**Phase 6 — COMPLETE.** All planned features implemented, tested, and documented.

### Phase 6 Feature List (Done)
- Stripe Billing & Tier Enforcement — subscription checkout, portal, webhook, tier-based feature gating, AI pricing usage tracking (50/mo starter limit), UpgradePrompt component, billing UI in Settings
- Cross-Customer Pricing Intelligence — `/api/pricing/cross-account` (Pro-only, three-level matching: exact → fuzzy → category fallback, Claude insight text), Market Intelligence panel on pricing page, admin Network Pricing Intelligence card, `/api/admin/network-stats`, seed script at `scripts/seed-cross-account-data.ts`
- Bugfix: `price_history.priced_at` and `sold_at` converted from numeric to `timestamptz` (migration `20260314050000`), regression tests added
- Migrations: `20260314030000_add_ai_lookups_to_accounts.sql`, `20260314030001_add_increment_ai_lookups_rpc.sql`, `20260314040000_create_cross_account_pricing_view.sql`, `20260314050000_fix_price_history_timestamp_columns.sql`
- Test suite: **158 Jest tests passing**, 5 Playwright E2E specs, 21 manual test plans

### Sidebar Navigation Improvements (Done)
- Removed "Pending Items" from sidebar (already a filter tab in Inventory)
- Added "Payouts" page (`/dashboard/payouts`) between Reports and Settings
- Payouts API (`/api/payouts`) — GET payout list with split calculations, PATCH mark as paid
- Expiring consignor badge on Consignors nav item (amber, count of consignors expiring ≤7 days or in grace)
- Migration `20260314060000_add_payout_fields.sql` — adds `paid_at` (timestamptz) and `payout_note` (text) to items table
- Updated E2E navigation spec (replaced Pending Items with Payouts)
- Test suite: **170 Jest tests passing**, 5 Playwright E2E specs, 22 manual test plans

### Production Deployment Preparation (Done)
- Fixed all build errors: unused imports/vars, JSX fragment issues, Stripe API version, pdf-lib types, Supabase PromiseLike `.catch()` pattern
- Created `DEPLOYMENT.md` — Vercel deployment guide with env var reference, Supabase setup, Stripe webhook config, post-deploy checklist
- Build passes cleanly (`npm run build` succeeds with only warnings, no errors)
- Test suite: **192 Jest tests passing**

### Superadmin Bugfixes (Done)
- **Root cause**: `admin@getconsigniq.com` existed in Supabase Auth but had no corresponding row in the `users` table. All profile queries returned null, causing: redirect to /dashboard (no `is_superadmin` to check), "Unknown" in sidebar (null profile), and admin API routes returning 403.
- Created migration `20260314070000_ensure_superadmin_user.sql` to insert superadmin user row (uses `auth.users` lookup + first available account, with `ON CONFLICT DO UPDATE SET is_superadmin = true`)
- Admin layout and all admin API routes now use service role client (`createAdminClient`) to bypass RLS
- Dashboard layout: added fallback — if RLS blocks profile query, retries with service role; if user is superadmin, redirects to `/admin`. Also redirects superadmins even when RLS returns a profile (covers direct URL, back button, etc.)
- Login redirect: superadmin users redirect to `/admin` after login via `/api/auth/check-superadmin` endpoint
- Sidebar name fallback: displays email when `full_name` is null/empty (also applied to admin sidebar)
- Created shared `src/lib/supabase/admin.ts` with `createAdminClient()` and `checkSuperadmin()` helpers
- Updated admin test mocks to use `@/lib/supabase/admin` mock
- **Critical lesson**: every Supabase Auth user that logs in MUST have a corresponding row in the `users` table — auth alone is not enough. The `users` table row provides `account_id`, `role`, `is_superadmin`, and `full_name`.
- Test suite: **192 Jest tests passing**

### Agreement Emails (Done)
- Email sending infrastructure: `src/lib/email.ts` (Resend wrapper), `src/lib/email-templates.ts` (agreement + expiry reminder templates with dual plain-text/HTML)
- `/api/agreements/send` — creates agreement record, sends email with store info, dates, splits, item list (no prices), pickup instructions
- `/api/agreements/notify-expiring` — finds consignors expiring in 3 days, sends reminders, skips already-notified, designed for cron
- `AgreementButton` component — Send/Resend Agreement with confirmation modal, last-sent date
- `IntakeAgreementPrompt` component — post-intake amber prompt with Send/Skip buttons
- Consignor detail page updated with agreement button in actions bar and intake prompt
- Full manual test plan at `docs/test-plans/agreement-emails.md`
- Env vars: `RESEND_API_KEY` (required), `RESEND_FROM_EMAIL` (optional, defaults to `noreply@consigniq.com`)
- Test suite: **203 Jest tests passing**

### Solo Pricer Tier + Admin User Management + Trial & Complimentary Accounts (Done)
- **Solo tier** ($9/mo, 200 AI lookups/mo): pricing-only experience with simplified sidebar (Dashboard, Price Lookup, My Inventory, Settings), solo dashboard with usage meter and upgrade CTA, no consignor/lifecycle/reports/payouts access
- **Account type system**: `accounts.account_type` column with values 'paid', 'trial', 'complimentary'. Trial accounts get 30-day free trial with banner countdown and lockout after expiry. Complimentary accounts bypass tier checks using `complimentary_tier`.
- **Bonus lookups**: `bonus_lookups` and `bonus_lookups_used` columns on accounts. 50-lookup top-up packs purchasable via Stripe one-time checkout. Monthly reset clears `ai_lookups_this_month` only — bonus lookups persist until used.
- **Trial experience**: TrialBanner component (color-coded days remaining), TrialExpiredPage (full-screen lockout with tier selection), `/api/trial/check-expiry` cron endpoint (sends reminder 1 day before expiry)
- **Admin user management** (`/admin/users`): cross-account user list with search/filter, Add User modal (creates account + location + auth user + users row), account type badges
- **Admin account actions**: Extend Trial (+30d), Convert to Complimentary, Convert to Paid, Disable/Enable Account, Solo tier in tier dropdown
- **Stripe preparation**: `STRIPE_SOLO_PRICE_ID` and `STRIPE_TOPUP_50_PRICE_ID` env vars, checkout route handles solo tier + topup_50 one-time purchase, webhook handles topup bonus lookups and trial→paid conversion, graceful handling of missing Stripe keys (503)
- **Billing route updates**: `/api/billing/checkout` now supports 4 tiers + topup, `/api/billing/webhook` handles topup_50 and trial→paid conversion
- **Usage enforcement update**: `/api/pricing/suggest` checks bonus lookups when monthly quota exhausted, increments `bonus_lookups_used` when monthly is spent
- Migration: `20260314080000_solo_tier_and_account_types.sql` — adds account_type, trial_ends_at, is_complimentary, complimentary_tier, bonus_lookups, bonus_lookups_used to accounts table
- Test suite: **245 Jest tests passing**, 5 Playwright E2E specs, 25 manual test plans
- Stripe products needed: Solo Pricer ($9/mo), Starter ($49/mo), Standard ($79/mo), Pro ($129/mo), 50 Lookup Top-Up ($5 one-time)

### Admin UX Fixes (Done)
- **Superadmin /dashboard redirect**: Dashboard layout now redirects superadmin users to `/admin` in all cases — whether RLS blocks the profile query or not. Previously only redirected when `!profile`, which missed the case where the superadmin had a users table row that RLS could return.
- **Admin sidebar "Back to App" removed**: The "Back to App" link is removed from the admin sidebar since superadmins live in `/admin` only and navigating to `/dashboard` would just redirect them back.
- Test suite: **245 Jest tests passing**

### Deferred to Phase 7+
- **Community Pricing Feed** — feature gate exists in `src/lib/tier-limits.ts` (`community_pricing_feed`, Pro tier), but no API, UI, or implementation. Will be designed and built in a future phase.
