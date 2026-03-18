# CLAUDE.md

## What is ConsignIQ

AI-powered consignment and estate sale management platform. Tracks consignors, items, pricing, lifecycle status (active/grace/donation-eligible), and store/consignor revenue splits. Multi-location franchise support (owner vs staff roles).

## Commands

- `npm run dev` — start dev server (Next.js on localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — Jest test suite (658 tests across unit + API)
- `npm run test:watch` — Jest in watch mode
- `npm run test:e2e` — Playwright E2E tests (requires `npm run dev` + seeded test data)
- `npm run test:e2e:ui` — Playwright E2E with interactive UI
- `/consigniq [task description]` — Claude Code slash command. File: `.claude/commands/consigniq.md`

## Tech Stack

- **Next.js 14** (App Router, React 18, TypeScript, `src/` directory)
- **Supabase** for auth, database, RLS — via `@supabase/ssr`
- **Tailwind CSS 3** (responsive: `md:` breakpoint for desktop)
- **lucide-react** for icons
- **Anthropic Claude API** (`@anthropic-ai/sdk`) for AI pricing + photo ID (vision). Singleton client + model constant in `src/lib/anthropic.ts`
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
- `src/lib/supabase/admin.ts` — service role client (`createAdminClient`), bypasses RLS. Exports `checkSuperadmin()` helper (authenticates via regular client, verifies `platform_role` via service role — needed because platform users may not satisfy RLS). Returns `{ authorized, userId, platformRole }`

### API Routes

**Items & Consignors:**
- `/api/items` — GET (params: `id`, `location_id`, `consignor_id`, `status`, `category`, `search`), POST, PATCH (auto-timestamps for sold/donated/priced; `status: 'sold'` writes `price_history` record)
- `/api/consignors` — GET/POST with location scoping
- `/api/consignors/expiring-count` — GET, single-query count of consignors expiring ≤7 days or in grace. Optional `?location_id=` filter. Scoped by account_id
- `/api/price-history` — GET similar sold items. Requires `category`, optional `name`, `exclude_item_id`, `limit` (max 50, default 10)
- `/api/locations` — GET (all account locations), POST (owner only)
- `/api/payouts` — GET (sold items grouped by consignor with split calcs, `location_id`/`status` filters), PATCH (mark items paid, `item_ids[]`, optional `payout_note`)

**Pricing:**
- `/api/pricing/comps` — SerpApi eBay sold comps, client-side filters out new-condition results. Explicit `getUser()` auth check. No debug console.logs
- `/api/pricing/suggest` — Claude AI pricing with optional photo (vision). Checks AI lookup limits. Uses `getAnthropicClient()` singleton. Tier-aware prompt: solo="resale pricing", shop+="consignment pricing"
- `/api/pricing/identify` — Claude vision item identification. Explicit `getUser()` auth check. Uses `getAnthropicClient()` singleton. All callers compress images client-side via `src/lib/compress-image.ts` (max 1200px, JPEG 0.8 quality)
- `/api/pricing/cross-account` — Enterprise-only. Three-level match: exact→fuzzy→category fallback. ≥3 samples required. Optional Claude insight.

**Item Photos:**
- `/api/items/[id]/photos` — POST (upload photo, max 3 per item, FormData `photo` file), GET (list ordered photos)
- `/api/items/[id]/photos/[photoId]` — DELETE (remove photo, promote primary, re-normalize order)
- `/api/items/[id]/photos/reorder` — PATCH (reorder via `{ photo_ids: string[] }`, updates display_order + is_primary)

**Admin (superadmin only):**
- `/api/admin/stats` — cross-account platform stats
- `/api/admin/accounts` — GET list/detail, PATCH tier/status/account_type. Filters: `?id=`, `?tier=`, `?status=`
- `/api/admin/users` — GET with `?search=`, `?account_type=`, `?tier=`. POST creates customer user (account+location+auth+users row, rejects account names matching system accounts) or platform user (when `platform_role` provided — uses system account, auto-creates system location if missing, super_admin only). Sends invite email via Resend (non-critical). PATCH takes `{ user_id, platform_role }` to set/remove platform roles (super_admin only)
- `/api/admin/users/[userId]` — DELETE (superadmin only). Deletes users table row + auth user. Cannot delete last super_admin. UUID validation
- `/api/admin/users/reset-password` — POST, takes `{ user_id }`, sends reset email via Resend
- `/api/admin/network-stats` — cross-account pricing intelligence stats
- `/api/admin/accounts/delete` — POST, takes `{ account_id, reason? }`. Complimentary/trial: hard deletes all data + auth users. Paid with Stripe: cancels subscription, soft deletes (status='deleted', deleted_at set). Sends notification email

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
- `/api/reports/query` — POST, takes `{ question, location_id? }`. Claude generates read-only SQL, validated (SELECT-only, account_id scoping, forbidden tables blocked, UUID validation on all interpolated IDs), executed via `execute_readonly_query` RPC. Allowed: items, consignors, price_history, locations, markdowns. Forbidden: users, accounts, invitations, agreements
- `/api/labels/generate` — POST, takes `{ item_ids[], size: '2x1'|'4x2' }`. Returns PDF blob
- `/api/trial/check-expiry` — POST cron. Auth via `Authorization: Bearer CRON_SECRET`. Excluded from middleware
- `/api/settings/location` (GET+PATCH), `/api/settings/account` (GET+PATCH), `/api/settings/invite` (POST), `/api/settings/profile` (PATCH — update full_name)
- `/api/settings/team/[userId]` — PATCH (change role), DELETE (remove member). Owner only. Cannot remove last owner or self
- `/api/consignors/[id]` — GET, PATCH (edit name/phone/email/notes with field allowlisting), DELETE (blocks if consignor has sold items)

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
- Middleware protects `/dashboard/*`, `/admin/*` (redirect to login), `/api/*` (401 JSON). Excluded: `/api/auth/*`, `/api/billing/webhook`, `/api/billing/check-grace-periods`, `/api/trial/*`, `/api/agreements/notify-expiring`
- Post-login: calls `/api/auth/check-superadmin` → superadmins go to `/admin`, others to `/dashboard`

### Platform Roles & Admin Access

- `platform_role` on `users` table gates `/admin` routes (super_admin/support/finance)
- `accounts.is_system` boolean marks system accounts (filtered from stats/lists)
- Admin layout checks via service role client (bypasses RLS)
- All admin API routes use `checkSuperadmin()` + `createAdminClient()` → 403 for users without `platform_role`
- Only `super_admin` can modify platform roles (PATCH `/api/admin/users`)
- All admin queries are cross-account (no `account_id` scoping)
- Admin has own sidebar (dark navy `bg-navy-900`, Logo + "Admin" badge, teal active nav). No "Back to App" link — platform users live in `/admin` only
- **Critical**: every Supabase Auth user MUST have a `users` table row. Auth alone is not enough.
- All platform role checks MUST use service role client (platform users may not satisfy RLS)
- See `/docs/prd/platform-roles.md` for full details

### PRDs (Product Requirements Documents)

Read the relevant PRD before modifying any of these systems:
- **AI Pricing:** `/docs/prd/ai-pricing-engine.md`
- **60-Day Lifecycle:** `/docs/prd/60-day-lifecycle.md`
- **Consignor Management:** `/docs/prd/consignor-management.md`
- **Multi-tenancy:** `/docs/prd/multi-tenancy.md`
- **Tier System:** `/docs/prd/tier-system.md`
- **Inventory:** `/docs/prd/inventory-management.md`
- **Admin Panel:** `/docs/prd/admin-panel.md`
- **Email System:** `/docs/prd/email-system.md`
- **Subscription Lifecycle:** `/docs/prd/subscription-lifecycle.md`
- **Account Deletion:** `/docs/prd/account-deletion.md`
- **Platform Roles:** `/docs/prd/platform-roles.md`
- **Sidebar Identity:** `/docs/prd/sidebar-identity.md`
- **Item Photos:** `/docs/prd/item-photos.md`

**Canonical brand reference:** `/docs/brand-guidelines.md` (copy of brand-identity PRD, use for future sessions)

### Stripe Billing & Tier Enforcement

#### Definitive Tier Feature Matrix
**DO NOT change these gates without explicit instruction.**

| Feature | Solo ($9) | Shop ($79) | Enterprise ($129) |
|---|---|---|---|
| AI pricing lookups | 200/mo | Unlimited | Unlimited |
| Price Lookup (AI + eBay comps) | Y | Y | Y |
| Photo identification | Y | Y | Y |
| Save to inventory | Y (personal) | Y | Y |
| CSV export | Y | Y | Y |
| Consignor management | - | Y | Y |
| 60-day lifecycle tracking | - | Y | Y |
| Agreement email generation | - | Y | Y |
| Payouts | - | Y | Y |
| Reports & analytics | - | Y | Y |
| Markdown schedules | - | Y | Y |
| Staff management | - | Y | Y |
| Repeat item history | - | Y | Y |
| Email notifications (expiry) | - | Y | Y |
| Multi-location | - | Y | Y |
| Cross-customer pricing intel | - | - | Y |
| Community pricing feed | - | - | Y |
| All Locations dashboard | - | - | Y |
| API access | - | - | Y |

**Key files:**
- `src/lib/tier-limits.ts` — `TIER_CONFIGS`, `FEATURE_REQUIRED_TIER`, `FEATURE_LABELS`
- `src/lib/feature-gates.ts` — `canUseFeature()`, `getUpgradeMessage()`, `isAccountActive()`, `getEffectiveTier()`, `canAccountUseFeature()`, `isLookupLimitReached()`
- `src/lib/stripe.ts` — `getStripe()` singleton
- `src/lib/anthropic.ts` — `ANTHROPIC_MODEL` constant + `getAnthropicClient()` singleton (used by all 5 AI routes)
- `src/lib/sidebar-identity.ts` — `SIDEBAR_BADGES`, `getBadgeConfig()`, `getDisplayName()` (config-driven sidebar identity display)
- `src/components/PhotoUploader.tsx` — shared multi-photo upload component (up to 3, reorder, Make Primary, analyze button). Used by Price Lookup, Inventory pricing, IntakeQueue
- `src/lib/auth-helpers.ts` — `getAuthenticatedUser()`, `getAuthenticatedProfile()` (shared auth pattern for all API routes)
- `src/lib/errors.ts` — `ERRORS` constants (`UNAUTHORIZED`, `PROFILE_NOT_FOUND`, `OWNER_REQUIRED`, `UPGRADE_REQUIRED`)
- `src/components/UpgradePrompt.tsx` — shown for locked features

**AI lookup tracking:** `accounts.ai_lookups_this_month` + `ai_lookups_reset_at`. Solo: 200/mo, others: unlimited. Incremented via `increment_ai_lookups` RPC. Monthly reset clears `ai_lookups_this_month` only.

**Bonus lookups:** `accounts.bonus_lookups` (purchased) + `bonus_lookups_used` (consumed). 50-lookup top-up packs ($5). Persist until used (not cleared on monthly reset).

**UI feature gating:** consignor management (shop+), markdown schedules (shop+), payouts (shop+), reports (shop+), "Priced Before" panel (shop+), email notifications (shop+), multi-location (shop+), cross-customer pricing (enterprise), community feed (enterprise), "All Locations" (enterprise)

**Server-side tier guards (two layers):**

1. **Page-level:** `requireFeature(feature)` in `src/lib/tier-guard.ts` — async server component guard. Fetches user profile + account tier, calls `canUseFeature()`, redirects to `/dashboard` if blocked. Used at top of:
   - `src/app/dashboard/consignors/page.tsx` — `requireFeature('consignor_mgmt')`
   - `src/app/dashboard/reports/layout.tsx` — `requireFeature('reports')`
   - `src/app/dashboard/payouts/layout.tsx` — `requireFeature('payouts')`

2. **API-level:** `canUseFeature(tier, feature)` checks in route handlers, returning 403 with upgrade message:
   - `/api/consignors` GET+POST — `canUseFeature(tier, 'consignor_mgmt')`
   - `/api/agreements/send` POST — `canUseFeature(tier, 'agreements')`
   - `/api/payouts` GET+PATCH — `canUseFeature(tier, 'payouts')`
   - `/api/pricing/cross-account` GET — `canUseFeature(tier, 'cross_customer_pricing')`

**Billing lifecycle emails** via Resend (from webhook): `buildUpgradeEmail()`, `buildCancellationEmail()`, `buildPaymentFailedEmail()`. All non-critical.

**Stripe price IDs (test mode):**
- `STRIPE_SOLO_PRICE_ID=price_1TB07NRoBkkefSr8k75xWZU4` ($9/mo)
- `STRIPE_SHOP_PRICE_ID=price_1TB07NRoBkkefSr8kQX1pXxL` ($79/mo)
- `STRIPE_ENTERPRISE_PRICE_ID=price_1TB07ORoBkkefSr8TjMEohzi` ($129/mo)
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
- **Settings**: Billing + Profile tabs only. Usage meter, buy top-up, manage billing, upgrade to Shop CTA
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
- **Pricing** (`/dashboard/inventory/[id]/price` + `/dashboard/pricing`): photo upload, eBay comps, AI pricing, "Priced Before" panel (shop+), "Market Intelligence" panel (enterprise), auto-capitalize, description hints
- **Reports** (`/dashboard/reports`): 13 sections (Store Performance, Pricing Performance, Inventory Snapshot, Activity Summary, Consignor Report, Category Performance, Aging Inventory, Consignor Rankings, Weekly Ops, Markdown Effectiveness, Pricing Accuracy, Payout Reconciliation, Donation & Tax). Time filter, CSV exports, AI query bar
- **Payouts** (`/dashboard/payouts`): consignor split calcs, mark as paid, filter tabs, CSV export
- **Settings** (`/dashboard/settings`): tier-aware tabs. Solo: Billing+Profile. Shop+: Location Settings, Locations (owner), Account Settings (owner)
- **Sidebar**: tier-aware nav, location switcher (owner), expiring consignor badge, role/tier label
- **Admin** (`/admin`): Overview stats, Users (CRUD + invite + platform user creation, role-based column/button visibility), Accounts (detail + tier/status/type management, reset password)
- **Help**: Tooltips, floating widget (`HelpWidget` — tier-aware quick links, page-aware ordering, client+server response caching with 24h TTL), AI search via `/api/help/search` + `src/lib/help-knowledge-base.ts`

## UI Standards

### Responsive Layout
All dashboard page containers use `w-full lg:max-w-5xl lg:mx-auto` with `px-4 py-6` padding. The `lg:` prefix (1024px+) ensures mobile layout is unaffected. Not applied to sidebar, admin, or auth pages.

### Button Hierarchy
- **Primary**: Filled teal (`bg-brand-600`) — one per page (e.g., "Price an Item")
- **Secondary**: Teal outline (`border-2 border-brand-600 text-brand-600`) — upgrade CTAs in cards

### Icons
All icons are outlined/stroke-based (`fill="none"`, `stroke="currentColor"`). Logo mark is the only filled exception.

## Critical Patterns

### fetch() calls must include `credentials: 'include'`
All client-side `fetch()` to `/api/` routes MUST include `credentials: 'include'` for mobile Safari cookie forwarding.

### Supabase schema column names
Always audit actual column names before writing queries:
- Consignors: `split_store`, `split_consignor` (integers, not `split_pct_*`)
- Items: `sold_date`, `donated_at`, `priced_at`, `intake_date`, `price`, `sold_price`, `current_markdown_pct`, `effective_price`, `paid_at` (timestamptz, nullable), `payout_note` (text, nullable)
- Markdowns: `item_id`, `markdown_pct`, `original_price`, `new_price`, `applied_at`
- Locations: `default_split_store`, `default_split_consignor`, `agreement_days`, `grace_days`, `markdown_enabled`
- Accounts: `id`, `name`, `tier` (solo/shop/enterprise), `stripe_customer_id`, `status`, `ai_lookups_this_month`, `ai_lookups_reset_at`, `account_type` (paid/trial/complimentary/cancelled_grace/cancelled_limited), `trial_ends_at` (timestamptz), `is_complimentary` (boolean), `complimentary_tier` (text), `bonus_lookups` (integer), `bonus_lookups_used` (integer), `deleted_at` (timestamptz, nullable), `deletion_reason` (text, nullable), `subscription_cancelled_at` (timestamptz, nullable), `subscription_period_end` (timestamptz, nullable), `cancelled_tier` (text, nullable), `is_system` (boolean, NOT NULL, default false)
- Users: `id`, `account_id`, `location_id`, `email`, `full_name`, `role`, `is_superadmin`, `platform_role` (text, nullable: super_admin/support/finance)
- Invitations: `id`, `account_id`, `email`, `role`, `token`, `created_at`, `expires_at`, `accepted_at`
- Price_history: `id`, `account_id`, `category`, `condition`, `created_at`, `days_to_sell`, `description`, `item_id`, `location_id` (NOT NULL), `name`, `priced_at` (timestamptz, NOT NULL), `sold`, `sold_at` (timestamptz, nullable), `sold_price`. Note: `priced_at`/`sold_at` converted from numeric to timestamptz (migration `20260314050000`)
- Item_photos: `id`, `item_id` (FK items, CASCADE), `account_id` (FK accounts), `storage_path`, `public_url`, `display_order` (smallint), `is_primary` (boolean), `created_at`. RLS by account. Supabase Storage bucket: `item-photos` (public, 2MB, jpeg/png/webp). `photo_url` on items is deprecated.
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

See `.env.example` for full list. Key services: Supabase, Anthropic, SerpApi, Resend, Stripe. Additional: `STRIPE_SOLO_PRICE_ID`, `STRIPE_SHOP_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`, `STRIPE_TOPUP_50_PRICE_ID`, `CRON_SECRET`. See `DEPLOYMENT.md` for Vercel deployment guide.

## Testing

**644 Jest tests passing.** 5 Playwright E2E specs. 42 manual test plans at `/docs/test-plans/`.

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
│   ├── password-validation.test.ts — Password form validation
│   ├── anthropic-config.test.ts   — ANTHROPIC_MODEL constant, singleton client
│   ├── lookup-limits.test.ts      — Solo 200/mo limit, bonus exhaustion, unlimited tiers
│   ├── solo-dashboard.test.ts     — Usage meter math, bar colors, reset date calc
│   ├── auth-helpers.test.ts       — Error constants validation
│   ├── trial-banner.test.ts       — Days remaining calc, color thresholds
│   ├── trial-expired.test.ts      — Tier display, pricing, config
│   ├── sidebar-tier-nav.test.ts   — Solo vs full nav, feature access
│   ├── compress-image.test.ts     — Dimension calc, aspect ratio, file size validation
│   ├── solo-ui-fixes.test.ts     — Solo inventory tabs, progress bar min width, welcome msg
│   ├── solo-pricing-prompt.test.ts — Solo vs consignment AI prompt language
│   ├── help-widget-tier.test.ts   — Tier-aware quick links, page ordering, cache logic
│   ├── subscription-lifecycle.test.ts — All state transitions, cancelled_grace/limited access
│   ├── logo-variant.test.ts          — Logo dark/light variant, sidebar usage, welcome message consistency
│   ├── upgrade-card.test.ts          — UpgradeCard config, price derivation, features, headline variants
│   ├── platform-roles.test.ts        — PlatformRole type validation, checkSuperadmin contract
│   ├── admin-users-page.test.ts     — Form modes, role-based visibility, submit body construction, platform user/system account tier hiding
│   ├── email-templates.test.ts      — Tagline constant, platform invite omits Plan, template consistency, ConsignIQ System account name
│   ├── confirm-modal.test.ts        — ConfirmModal component contract, confirm() removal verification
│   ├── sidebar-identity.test.ts     — getBadgeConfig all 8 keys, getDisplayName edge cases, color classes, platform role precedence
│   ├── brand-guidelines.test.ts     — Brand doc existence, typography colors, heading/link color consistency
│   └── photo-uploader.test.ts       — PhotoSlot interface, max 3 slots, reorder logic, makePrimary logic, primary badge, analyze button
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
│   ├── admin-users.test.ts        — GET/POST, superadmin enforcement, invite email, platform user creation
│   ├── admin-user-delete.test.ts  — DELETE /api/admin/users/[userId], auth, UUID validation, last-super-admin guard
│   ├── trial-check-expiry.test.ts — auth, reminder emails, expired count
│   ├── password-flow.test.ts      — reset-password, forgot-password
│   ├── critical-security.test.ts  — UUID validation (5), tier enforcement (8)
│   ├── expiring-count.test.ts     — GET /api/consignors/expiring-count, auth, scoping, counting
│   ├── admin-stats-count.test.ts  — I3 COUNT queries, head:true verification
│   ├── settings-profile.test.ts  — PATCH /api/settings/profile auth, validation, name update
│   ├── account-delete.test.ts   — POST /api/admin/accounts/delete, auth, hard/soft delete
│   ├── platform-roles.test.ts  — PATCH /api/admin/users platform role management
│   └── item-photos.test.ts    — POST/GET/DELETE/PATCH photo endpoints, auth, max 3, primary promotion, reorder
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
- `20260315000000` — performance indexes: items (3), consignors (2), price_history (1), users (1), locations (1), accounts (1)
- `20260315010000` — add deleted_at (timestamptz) and deletion_reason (text) to accounts
- `20260315020000` — add subscription_cancelled_at, subscription_period_end, cancelled_tier to accounts
- `20260316000000` — make items.consignor_id nullable (Solo users save without consignor)
- `20260316010000` — add 'archived' to items status CHECK constraint
- `20260316020000` — platform roles: add `users.platform_role`, `accounts.is_system`, migrate data
- `20260316030000` — tier rename: starter/standard → shop, pro → enterprise, update CHECK constraints and data
- `20260317000000` — item_photos table, indexes, RLS. Storage bucket `item-photos` created manually

## Security

### Code Review — March 2026

Full report: `docs/code-review/code-review-march-2026.md`

**5 critical issues — ALL RESOLVED:**

- **C1: SQL injection in `/api/reports/query`** — `location_id` and `account_id` are interpolated into AI-generated SQL. Fix: UUID regex validation (`/^[0-9a-f]{8}-…$/i`) on `location_id` (from request body), `profile.account_id`, and `profile.location_id` before SQL generation. Returns 400 on invalid. Located at `src/app/api/reports/query/route.ts:81-92`.

- **C2: Missing auth on `/api/pricing/comps`** — relied solely on middleware (which can be misconfigured). Fix: explicit `supabase.auth.getUser()` check at top of handler, returns 401 if no user. Located at `src/app/api/pricing/comps/route.ts:18`.

- **C3: Missing auth on `/api/pricing/identify`** — same pattern as C2. Fix: explicit `getUser()` check. Located at `src/app/api/pricing/identify/route.ts:17`.

- **C4: No server-side solo route guards** — solo users could navigate directly to `/dashboard/consignors`, `/dashboard/reports`, `/dashboard/payouts`. Fix: `requireFeature()` in `src/lib/tier-guard.ts` (see "Server-side tier guards" above).

- **C5: No tier enforcement on API routes** — solo users could call shop+ APIs directly. Fix: `canUseFeature()` checks in `/api/consignors`, `/api/agreements/send`, `/api/payouts` (see "Server-side tier guards" above).

**Regression tests:** `__tests__/api/critical-security.test.ts` — 5 UUID validation tests (C1) + 7 tier enforcement tests (C5) = 12 total.

**7 IMPORTANT issues — ALL RESOLVED:**
- I1: N+1 sidebar query → single `/api/consignors/expiring-count` endpoint
- I2: Reports full dataset load → `.limit(2000)` + `.order()` on all queries
- I3: Admin stats full fetches → `{ count: 'exact', head: true }` count-only queries
- I4: Missing DB indexes → migration `20260315000000` with 9 composite indexes
- I5: Debug console.logs → removed 12 statements, kept console.error
- I6: Hardcoded Anthropic model → `src/lib/anthropic.ts` with `ANTHROPIC_MODEL` constant + `getAnthropicClient()` singleton
- I7: Inconsistent cron auth → CRON_SECRET pattern on `/api/agreements/notify-expiring`

**18 MINOR issues — ALL RESOLVED:**
- M1/M2: `getAuthenticatedUser()` + `getAuthenticatedProfile()` in `src/lib/auth-helpers.ts`, applied to 12+ routes
- M3: Already fixed in I6 (Anthropic singleton)
- M4: `ERRORS` constants in `src/lib/errors.ts`, consistent messages across all routes
- M5: try/catch on fire-and-forget ops (agreements email_sent_at, items price_history)
- M6: Removed unused `request` param from billing/portal
- M7: Network stats queries sold records directly via `.eq('sold', true)` instead of JS filter
- M8: Payouts uses Map for O(n+m) grouping instead of O(n*m) nested filter

**Open issues:** ~5 component tests missing (SetupPasswordPage hash token parsing, expired token handling).

## Deferred to Phase 7+

- **Community Pricing Feed** — gate exists (`community_pricing_feed`, Enterprise), no implementation
- **API Access** — gate exists (`api_access`, Enterprise), no endpoints
- **Advanced Markdown Schedules** — Shop tier, basic implementation (hardcoded schedule)
