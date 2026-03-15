# CLAUDE.md

## What is ConsignIQ

AI-powered consignment and estate sale management platform. Tracks consignors, items, pricing, lifecycle status (active/grace/donation-eligible), and store/consignor revenue splits. Multi-location franchise support (owner vs staff roles).

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Jest test suite (272 tests across unit + API)
- `npm run test:watch` — Jest in watch mode
- `npm run test:e2e` — Playwright E2E tests (requires `npm run dev` + seeded test data)
- `npm run test:e2e:ui` — Playwright E2E with interactive UI
- `/consigniq [task description]` — Claude Code slash command. File: `.claude/commands/consigniq.md`

## Tech Stack

- **Next.js 14** (App Router, React 18, TypeScript, `src/` directory)
- **Supabase** for auth, database, RLS — via `@supabase/ssr`
- **Tailwind CSS 3** (responsive: `md:` breakpoint for desktop)
- **lucide-react** for icons
- **Anthropic Claude API** (`@anthropic-ai/sdk`) for AI pricing + photo ID (vision)
- **SerpApi** for eBay sold comp lookups (`LH_Sold=1`, `LH_Complete=1`, `LH_ItemCondition=3000`)
- **pdf-lib** for PDF label generation
- **Stripe** (`stripe`) for subscription billing
- **Resend** (`resend`) for transactional email
- **Playwright** for E2E browser testing (chromium)
- Path alias: `@/*` maps to `./src/*`

## Architecture

### Supabase Client Pattern

Three client factories:
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`), `'use client'` components
- `src/lib/supabase/server.ts` — server client (`createServerClient`), Server Components + API routes. Exported as both `createServerClient` and `createClient`
- `src/lib/supabase/admin.ts` — service role client (`createAdminClient`), bypasses RLS. Exports `checkSuperadmin()` helper (authenticates via regular client, verifies `is_superadmin` via service role — needed because superadmin may not satisfy RLS)

### API Routes

**Items & Consignors:**
- `/api/items` — GET (params: `id`, `location_id`, `consignor_id`, `status`, `category`, `search`), POST, PATCH (auto-timestamps for sold/donated/priced; `status: 'sold'` writes `price_history` record)
- `/api/consignors` — GET/POST with location scoping
- `/api/price-history` — GET similar sold items. Requires `category`, optional `name`, `exclude_item_id`, `limit` (max 50, default 10)
- `/api/locations` — GET (all account locations), POST (owner only)
- `/api/payouts` — GET (sold items grouped by consignor with split calcs, `location_id`/`status` filters), PATCH (mark items paid, `item_ids[]`, optional `payout_note`)

**Pricing:**
- `/api/pricing/comps` — SerpApi eBay sold comps, client-side filters out new-condition results
- `/api/pricing/suggest` — Claude AI pricing with optional photo (vision). Checks AI lookup limits.
- `/api/pricing/identify` — Claude vision item identification
- `/api/pricing/cross-account` — Pro-only. Three-level match: exact→fuzzy→category fallback. ≥3 samples required. Optional Claude insight.

**Admin (superadmin only):**
- `/api/admin/stats` — cross-account platform stats
- `/api/admin/accounts` — GET list/detail, PATCH tier/status/account_type. Filters: `?id=`, `?tier=`, `?status=`
- `/api/admin/users` — GET with `?search=`, `?account_type=`, `?tier=`. POST creates account+location+auth user+users row (upsert for trigger compat), sends invite email via Resend (non-critical)
- `/api/admin/users/reset-password` — POST, takes `{ user_id }`, sends reset email via Resend
- `/api/admin/network-stats` — cross-account pricing intelligence stats

**Billing:**
- `/api/billing/checkout` — POST, takes `{ tier }` or `{ product: 'topup_50' }`. Owner only. Returns `{ url }`
- `/api/billing/portal` — POST, creates Stripe Portal session. Owner only
- `/api/billing/webhook` — POST, excluded from auth middleware. Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Sends lifecycle emails via Resend (non-critical)

**Auth (excluded from middleware):**
- `/api/auth/check-superadmin` — GET, returns `{ is_superadmin }`. Uses service role
- `/api/auth/forgot-password` — POST public. Always returns 200 (prevents enumeration)

**Other:**
- `/api/agreements/send` — POST, takes `{ consignor_id }`. Creates agreement record, sends email
- `/api/agreements/notify-expiring` — POST cron. Finds consignors expiring in 3 days, sends reminders
- `/api/help/search` — POST, takes `{ question }`. Claude with help knowledge base context
- `/api/reports/query` — POST, takes `{ question, location_id? }`. Claude generates read-only SQL, validated (SELECT-only, account_id scoping, forbidden tables blocked), executed via `execute_readonly_query` RPC. Allowed: items, consignors, price_history, locations, markdowns. Forbidden: users, accounts, invitations, agreements
- `/api/labels/generate` — POST, takes `{ item_ids[], size: '2x1'|'4x2' }`. Returns PDF blob
- `/api/trial/check-expiry` — POST cron. Auth via `Authorization: Bearer CRON_SECRET`. Excluded from middleware
- `/api/settings/location` (GET+PATCH), `/api/settings/account` (GET+PATCH), `/api/settings/invite` (POST)

### Contexts

**UserContext** (`src/contexts/UserContext.tsx`): `UserProvider` + `useUser()` hook. Provides id, account_id, location_id, role, joined accounts/locations.

**LocationContext** (`src/contexts/LocationContext.tsx`): `LocationProvider` + `useLocation()` hook.
- Staff: locked to assigned `location_id`
- Owner: can switch locations + "All Locations" view
- Persists in `localStorage` (key: `consigniq_active_location`)
- Updates both context state AND URL (`?location_id=xxx`)
- Exposes: `activeLocationId`, `activeLocationName`, `locations[]`, `isAllLocations`, `canSwitchLocations`, `setActiveLocation()`

### Type System

- `src/types/database.ts` — mirrors Supabase schema, `Database` generic interface
- `src/types/index.ts` — app-level types with UI helpers (`getLifecycleStatus`, `COLOR_CLASSES`, `ITEM_CATEGORIES`, `CONDITION_LABELS`). Most components import from `@/types`
- Note: field name mismatches exist (e.g., `split_pct_store` vs `split_store`). `types/index.ts` reflects actual usage.

### Auth & Middleware

- Supabase email/password auth. Login: `/auth/login`. Password setup: `/auth/setup-password` (invite + recovery links)
- Setup-password manually parses `access_token`/`refresh_token` from URL hash → `setSession()` (required because `@supabase/ssr` uses cookie storage, doesn't auto-detect hash fragments)
- Dashboard layout: auth check → load profile (with service role fallback) → redirect superadmins to `/admin` → wrap in `<UserProvider>` + `<LocationProvider>`
- Middleware protects `/dashboard/*`, `/admin/*` (redirect to login), `/api/*` (401 JSON). Excluded: `/api/auth/*`, `/api/billing/webhook`, `/api/trial/*`
- Post-login: calls `/api/auth/check-superadmin` → superadmins go to `/admin`, others to `/dashboard`

### Superadmin Access

- `is_superadmin` on `users` table gates `/admin` routes
- Admin layout checks via service role client (bypasses RLS)
- All admin API routes use `checkSuperadmin()` + `createAdminClient()` → 403 for non-superadmins
- All admin queries are cross-account (no `account_id` scoping)
- Admin has own sidebar (red/Shield branding). No "Back to App" link — superadmins live in `/admin` only
- **Critical**: every Supabase Auth user MUST have a `users` table row. Auth alone is not enough.
- All superadmin checks MUST use service role client (superadmin may not satisfy RLS)

### Stripe Billing & Tier Enforcement

#### Definitive Tier Feature Matrix
**DO NOT change these gates without explicit instruction.**

| Feature | Solo ($9) | Starter ($49) | Standard ($79) | Pro ($129) |
|---|---|---|---|---|
| AI pricing lookups | 200/mo | Unlimited | Unlimited | Unlimited |
| Price Lookup (AI + eBay comps) | Y | Y | Y | Y |
| Photo identification | Y | Y | Y | Y |
| Save to inventory | Y (personal) | Y | Y | Y |
| CSV export | Y | Y | Y | Y |
| Consignor management | - | Y | Y | Y |
| 60-day lifecycle tracking | - | Y | Y | Y |
| Agreement email generation | - | Y | Y | Y |
| Payouts | - | Y | Y | Y |
| Reports & analytics | - | Y | Y | Y |
| Markdown schedules | - | Y | Y | Y |
| Staff management | - | Y | Y | Y |
| Repeat item history | - | - | Y | Y |
| Email notifications (expiry) | - | - | Y | Y |
| Multi-location | - | - | Y | Y |
| Cross-customer pricing intel | - | - | - | Y |
| Community pricing feed | - | - | - | Y |
| All Locations dashboard | - | - | - | Y |
| API access | - | - | - | Y |

**Key files:**
- `src/lib/tier-limits.ts` — `TIER_CONFIGS`, `FEATURE_REQUIRED_TIER`, `FEATURE_LABELS`
- `src/lib/feature-gates.ts` — `canUseFeature()`, `getUpgradeMessage()`, `isAccountActive()`, `getEffectiveTier()`, `canAccountUseFeature()`, `isLookupLimitReached()`
- `src/lib/stripe.ts` — `getStripe()` singleton
- `src/components/UpgradePrompt.tsx` — shown for locked features

**AI lookup tracking:** `accounts.ai_lookups_this_month` + `ai_lookups_reset_at`. Solo: 200/mo, others: unlimited. Incremented via `increment_ai_lookups` RPC. Monthly reset clears `ai_lookups_this_month` only.

**Bonus lookups:** `accounts.bonus_lookups` (purchased) + `bonus_lookups_used` (consumed). 50-lookup top-up packs ($5). Persist until used (not cleared on monthly reset).

**UI feature gating:** consignor management (starter+), markdown schedules (starter+), payouts (starter+), reports (starter+), "Priced Before" panel (standard+), email notifications (standard+), multi-location (standard+), cross-customer pricing (pro), community feed (pro), "All Locations" (pro)

**Server-side tier guards:** `requireFeature()` in `src/lib/tier-guard.ts` — used in dashboard layouts/pages for consignors, reports, payouts. API routes check `canUseFeature()` on consignors (GET/POST), agreements/send, payouts (GET/PATCH).

**Billing lifecycle emails** via Resend (from webhook): `buildUpgradeEmail()`, `buildCancellationEmail()`, `buildPaymentFailedEmail()`. All non-critical.

**Stripe price IDs (test mode):**
- `STRIPE_SOLO_PRICE_ID=price_1TB07NRoBkkefSr8k75xWZU4` ($9/mo)
- `STRIPE_STARTER_PRICE_ID=price_1TB07NRoBkkefSr86Zf66OfO` ($49/mo)
- `STRIPE_STANDARD_PRICE_ID=price_1TB07NRoBkkefSr8kQX1pXxL` ($79/mo)
- `STRIPE_PRO_PRICE_ID=price_1TB07ORoBkkefSr8TjMEohzi` ($129/mo)
- `STRIPE_TOPUP_50_PRICE_ID=price_1TB07ORoBkkefSr8Ey050TZt` ($5 one-time)

### Account Type System

Three types via `accounts.account_type`:
- **paid** (default): tier determines features
- **trial**: 30-day free trial → full-screen lockout after `trial_ends_at`. Cron sends reminder 1 day before
- **complimentary**: `is_complimentary = true`, `complimentary_tier` overrides tier for feature checks

Key functions in `src/lib/feature-gates.ts`: `isAccountActive()`, `getEffectiveTier()`, `canAccountUseFeature()`, `isLookupLimitReached()`

### Solo Pricer Tier

Solo ($9/mo, 200 AI lookups/mo) — pricing-only experience:
- **Sidebar**: Dashboard, Price Lookup, My Inventory, Settings. "Solo Pricer" label. Upgrade CTA → direct Stripe checkout
- **Dashboard**: `SoloDashboard` component (usage meter, quick actions, upgrade CTA). No consignor/location content
- **Settings**: Billing + Profile tabs only. Usage meter, buy top-up, manage billing, upgrade to Starter CTA
- **Inventory**: Items without `consignor_id` (nullable). Mark as Sold, Archive
- Component: `src/components/SoloDashboard.tsx`

### Trial Experience

- `TrialBanner` (`src/components/TrialBanner.tsx`): color-coded days remaining (green >14, yellow 7-14, orange <7)
- `TrialExpiredPage` (`src/components/TrialExpiredPage.tsx`): full-screen lockout with tier selection
- Cron: `/api/trial/check-expiry` sends reminders for trials expiring tomorrow

### Multi-tenancy

Data scoped by `account_id` + `location_id`. Staff locked to assigned location. Owner can switch via sidebar. "All Locations" uses `account_id` instead of `location_id`. RLS handles row-level access.

### Consignor Lifecycle

intake_date → expiry_date → grace_end_date. `getLifecycleStatus()` in `src/types/index.ts` computes state (days remaining, color, grace/donation eligibility). Timezone fix: parses dates as local time (appends `T00:00:00`).

### Email Infrastructure

- `src/lib/email.ts` — `sendEmail()` wrapper around Resend. From: `ConsignIQ <${RESEND_FROM_EMAIL}>`
- `src/lib/email-templates.ts` — templates (all dual plain-text + HTML):
  - `buildAgreementEmail()` — store header, dates, splits, items (NO prices), pickup instructions
  - `buildExpiryReminderEmail()` — store name, expiry date, grace end, phone
  - `buildInviteEmail()` — user name, account name, tier, setup link
  - `buildPasswordResetEmail()` — reset CTA, 24-hour expiry
  - `buildUpgradeEmail()`, `buildCancellationEmail()`, `buildPaymentFailedEmail()` — billing lifecycle
- `AgreementButton` + `IntakeAgreementPrompt` components on consignor detail page

### Category-Aware Pricing

12 categories in `src/lib/pricing/categories.ts`, each with `searchTerms()`, `priceGuidance`, `typicalMargin`. Description hints for high-variance categories shown when description empty or <20 chars.

## Key Pages

- **Dashboard** (`/dashboard`): stats, lifecycle alerts, quick actions. Solo → `SoloDashboard`
- **Consignors** (`/dashboard/consignors`): list, detail (lifecycle bar, agreement button), intake form with photo AI
- **Inventory** (`/dashboard/inventory`): status tabs, search, filters, edit/sell/donate modals, CSV export, bulk label printing
- **Pricing** (`/dashboard/inventory/[id]/price` + `/dashboard/pricing`): photo upload, eBay comps, AI pricing, "Priced Before" panel (standard+), "Market Intelligence" panel (pro), auto-capitalize, description hints
- **Reports** (`/dashboard/reports`): 13 sections (Store Performance, Pricing Performance, Inventory Snapshot, Activity Summary, Consignor Report, Category Performance, Aging Inventory, Consignor Rankings, Weekly Ops, Markdown Effectiveness, Pricing Accuracy, Payout Reconciliation, Donation & Tax). Time filter, CSV exports, AI query bar
- **Payouts** (`/dashboard/payouts`): consignor split calcs, mark as paid, filter tabs, CSV export
- **Settings** (`/dashboard/settings`): tier-aware tabs. Solo: Billing+Profile. Starter+: Location Settings, Locations (owner), Account Settings (owner)
- **Sidebar**: tier-aware nav, location switcher (owner), expiring consignor badge, role/tier label
- **Admin** (`/admin`): Overview stats, Users (CRUD + invite), Accounts (detail + tier/status/type management, reset password)
- **Help**: Tooltips, floating widget (`HelpWidget`), AI search via `/api/help/search` + `src/lib/help-knowledge-base.ts`

## Critical Patterns

### fetch() calls must include `credentials: 'include'`
All client-side `fetch()` to `/api/` routes MUST include `credentials: 'include'` for mobile Safari cookie forwarding.

### Supabase schema column names
Always audit actual column names before writing queries:
- Consignors: `split_store`, `split_consignor` (integers, not `split_pct_*`)
- Items: `sold_date`, `donated_at`, `priced_at`, `intake_date`, `price`, `sold_price`, `current_markdown_pct`, `effective_price`, `paid_at` (timestamptz, nullable), `payout_note` (text, nullable)
- Markdowns: `item_id`, `markdown_pct`, `original_price`, `new_price`, `applied_at`
- Locations: `default_split_store`, `default_split_consignor`, `agreement_days`, `grace_days`, `markdown_enabled`
- Accounts: `id`, `name`, `tier` (solo/starter/standard/pro), `stripe_customer_id`, `status`, `ai_lookups_this_month`, `ai_lookups_reset_at`, `account_type` (paid/trial/complimentary), `trial_ends_at` (timestamptz), `is_complimentary` (boolean), `complimentary_tier` (text), `bonus_lookups` (integer), `bonus_lookups_used` (integer)
- Users: `id`, `account_id`, `location_id`, `email`, `full_name`, `role`, `is_superadmin`
- Invitations: `id`, `account_id`, `email`, `role`, `token`, `created_at`, `expires_at`, `accepted_at`
- Price_history: `id`, `account_id`, `category`, `condition`, `created_at`, `days_to_sell`, `description`, `item_id`, `location_id` (NOT NULL), `name`, `priced_at` (timestamptz, NOT NULL), `sold`, `sold_at` (timestamptz, nullable), `sold_price`. Note: `priced_at`/`sold_at` converted from numeric to timestamptz (migration `20260314050000`)
- Agreements: `id`, `account_id`, `consignor_id`, `generated_at`, `expiry_date`, `grace_end`, `email_sent_at`

### Never hardcode location_id
- Client components: `useLocation().activeLocationId` (not `useUser().location_id`)
- Server components: `searchParams.location_id`
- API routes: request query params or body

### Admin users POST pattern
Uses `upsert` (onConflict: 'id') for public.users row because Supabase trigger on auth.users auto-creates partial row.

### Invite/reset link redirect workaround
`redirect_to` param in generated action links explicitly rewritten to `{NEXT_PUBLIC_APP_URL}/auth/setup-password` — Supabase ignores `redirectTo` when URL isn't in dashboard Redirect URLs allowlist.

## Environment Variables

See `.env.example` for full list. Key services: Supabase, Anthropic, SerpApi, Resend, Stripe. Additional: `STRIPE_SOLO_PRICE_ID`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_STANDARD_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_TOPUP_50_PRICE_ID`, `CRON_SECRET`. See `DEPLOYMENT.md` for Vercel deployment guide.

## Testing

**272 Jest tests passing.** 5 Playwright E2E specs. 26 manual test plans at `/docs/test-plans/`.

### Test Structure
```
__tests__/
├── unit/
│   ├── lifecycle.test.ts          — getLifecycleStatus(), CONDITION_LABELS, ITEM_CATEGORIES, COLOR_CLASSES
│   ├── categories.test.ts         — getCategoryConfig(), search terms, fallback
│   ├── help-components.test.ts    — Knowledge base content/topics
│   ├── feature-gates.test.ts      — canUseFeature(), tier configs, account type helpers, lookup limits
│   ├── auto-capitalize.test.ts    — Item name auto-capitalize
│   ├── description-hints.test.ts  — Category-specific description hints
│   └── password-validation.test.ts — Password form validation
├── api/
│   ├── consignors.test.ts         — GET/POST validation, auth, location scoping
│   ├── items.test.ts              — GET/POST/PATCH, filters, auto-timestamps, price_history, timestamp regression
│   ├── pricing.test.ts            — comps/identify/suggest, SerpApi params, new-condition exclusion
│   ├── settings.test.ts           — role enforcement (owner vs staff)
│   ├── locations.test.ts          — GET/POST, validation, role enforcement
│   ├── price-history.test.ts      — GET, auth, validation, search
│   ├── admin.test.ts              — GET/PATCH admin stats + accounts, superadmin enforcement
│   ├── help.test.ts               — POST help/search, AI scoping
│   ├── reports-query.test.ts      — SQL validation, role scoping, security
│   ├── labels.test.ts             — validation, account scoping, PDF output
│   ├── billing.test.ts            — checkout + portal, auth, role, Stripe session
│   ├── billing-webhook.test.ts    — signature, tier updates, downgrade
│   ├── cross-account-pricing.test.ts — tier enforcement, matching
│   ├── admin-network-stats.test.ts — superadmin enforcement
│   ├── payouts.test.ts            — GET/PATCH, auth, filters, split calcs, mark as paid
│   ├── agreements.test.ts         — send + notify-expiring, auth, validation, templates
│   ├── admin-users.test.ts        — GET/POST, superadmin enforcement, invite email
│   ├── trial-check-expiry.test.ts — auth, reminder emails, expired count
│   ├── password-flow.test.ts      — reset-password, forgot-password
│   └── critical-security.test.ts  — UUID validation (5), tier enforcement (8)
```

### Playwright E2E
```
e2e/
├── auth.spec.ts           — Login render, invalid creds, valid redirect
├── navigation.spec.ts     — 7 nav items, active state, mobile hamburger
├── data-isolation.spec.ts — Admin redirect, unauth blocked
├── help-widget.spec.ts    — Widget on dashboard, absent on admin
└── labels.spec.ts         — Checkboxes, bulk actions, print button
```
E2E requires running dev server + seeded Supabase data. `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` env vars. `npx playwright install chromium`.

## Migrations

- `20260314023405` — add sold_price to price_history
- `20260314030000` — add ai_lookups to accounts
- `20260314030001` — add increment_ai_lookups RPC
- `20260314040000` — create cross_account_pricing view
- `20260314050000` — fix price_history timestamp columns (numeric → timestamptz)
- `20260314060000` — add payout fields (paid_at, payout_note) to items
- `20260314070000` — ensure superadmin user row
- `20260314080000` — solo tier + account types (account_type, trial_ends_at, is_complimentary, complimentary_tier, bonus_lookups, bonus_lookups_used)

## Code Review — March 2026

Full report: `docs/code-review/code-review-march-2026.md`

**5 critical issues — ALL RESOLVED:**
- C1: SQL injection in reports query → UUID validation on location_id/account_id
- C2: Missing auth on /api/pricing/comps → `getUser()` check added
- C3: Missing auth on /api/pricing/identify → `getUser()` check added
- C4: No server-side solo route guards → `requireFeature()` tier guard + layout guards
- C5: No tier enforcement on API routes → `canUseFeature()` checks added

**Open issues:** 7 important (N+1 sidebar fetch, reports perf, admin stats perf, missing DB indexes, debug console.logs, hardcoded model names, inconsistent cron auth), 18 minor, ~30-40 component tests missing.

## Deferred to Phase 7+

- **Community Pricing Feed** — gate exists (`community_pricing_feed`, Pro), no implementation
- **API Access** — gate exists (`api_access`, Pro), no endpoints
- **Advanced Markdown Schedules** — Standard tier, currently same as Starter (hardcoded schedule)
