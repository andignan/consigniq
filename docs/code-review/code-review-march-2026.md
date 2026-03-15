# ConsignIQ Code Review — March 2026

**Date:** 2026-03-15
**Reviewer:** Claude Code (Opus 4.6)
**Codebase:** 260 tests passing, 26 test files, ~50 source files
**Scope:** Security, code quality, tier gates, test coverage, performance, CLAUDE.md accuracy

---

## CRITICAL ISSUES (Must fix before real customers) — ALL RESOLVED

### C1. SQL Injection in Reports Query Route — RESOLVED
- **File:** `src/app/api/reports/query/route.ts`
- **Fix applied:** UUID regex validation (`/^[0-9a-f]{8}-...$/i`) on `location_id` and `account_id` before any SQL interpolation. Rejects requests with invalid UUIDs with 400 status.
- **Regression test:** `critical-security.test.ts` — SQL injection payload, non-UUID string, empty string all rejected; valid UUIDs and "all" accepted.

### C2. Missing Authentication on `/api/pricing/comps` — RESOLVED
- **File:** `src/app/api/pricing/comps/route.ts`
- **Fix applied:** Added explicit `supabase.auth.getUser()` check at top of handler, returns 401 if no valid session.

### C3. Missing Authentication on `/api/pricing/identify` — RESOLVED
- **File:** `src/app/api/pricing/identify/route.ts`
- **Fix applied:** Added explicit `supabase.auth.getUser()` check at top of handler, returns 401 if no valid session.

### C4. No Server-Side Route Guards for Solo Tier — RESOLVED
- **Fix applied:** Created `src/lib/tier-guard.ts` with `requireFeature()` utility. Added guards:
  - `src/app/dashboard/consignors/page.tsx` — `requireFeature('consignor_mgmt')` at top of page
  - `src/app/dashboard/reports/layout.tsx` — `requireFeature('reports')` in route layout
  - `src/app/dashboard/payouts/layout.tsx` — `requireFeature('payouts')` in route layout
- Solo users navigating to these URLs are redirected to `/dashboard`.

### C5. No Tier Enforcement on API Routes — RESOLVED
- **Fix applied:** Added `canUseFeature(tier, feature)` checks to:
  - `/api/consignors` GET + POST — checks `consignor_mgmt`
  - `/api/agreements/send` POST — checks `agreements`
  - `/api/payouts` GET + PATCH — checks `payouts`
- Solo tier returns 403 with "Upgrade required" message.
- **Regression test:** `critical-security.test.ts` — solo blocked from consignor_mgmt, payouts, agreements, reports, lifecycle, staff_management; starter allowed.

---

## IMPORTANT ISSUES (Fix soon) — ALL RESOLVED

### I1. N+1 Query in Sidebar Expiring Consignor Badge — RESOLVED
- **File:** `src/components/layout/Sidebar.tsx`
- **Fix applied:** Created `/api/consignors/expiring-count` endpoint. Single DB query scoped by `account_id` (with optional `location_id` filter). Sidebar now makes one API call instead of N per-location fetches.
- **New file:** `src/app/api/consignors/expiring-count/route.ts`
- **Tests:** `expiring-count.test.ts` — auth, 404, count=0, account scoping, location filter, expiry+grace counting

### I2. Reports Page Loads Entire Dataset Client-Side — RESOLVED
- **File:** `src/app/dashboard/reports/page.tsx`
- **Fix applied:** Added `.limit(2000)` and `.order('intake_date', { ascending: false })` to items, consignors, and markdowns queries. Prevents memory spikes for large accounts while keeping all 13 report sections functional.

### I3. Admin Stats Fetches All Records Instead of COUNT() — RESOLVED
- **File:** `src/app/api/admin/stats/route.ts`
- **Fix applied:** Replaced full table fetches with `supabase.from(table).select('*', { count: 'exact', head: true })`. 19 parallel count-only queries (no data transfer). Added `solo` to `byTier` breakdown.
- **Tests:** `admin-stats-count.test.ts` — verifies count:exact/head:true usage, numeric responses, solo tier in breakdown

### I4. Missing Database Indexes — RESOLVED
- **Migration:** `supabase/migrations/20260315000000_add_performance_indexes.sql`
- **Indexes added:** 9 composite indexes on items (3), consignors (2), price_history (1), users (1), locations (1), accounts (1)

### I5. Debug Console.logs in Production Code — RESOLVED
- **Fix applied:** Removed 8 `console.log` statements from `/api/pricing/comps/route.ts` and 4 from `/dashboard/inventory/[id]/price/page.tsx`. Kept all `console.error` for real error logging.

### I6. Anthropic Model Name Hardcoded in 5 Routes — RESOLVED
- **New file:** `src/lib/anthropic.ts` — exports `ANTHROPIC_MODEL` constant and `getAnthropicClient()` singleton
- **Fix applied:** All 5 routes (`help/search`, `pricing/identify`, `pricing/suggest`, `pricing/cross-account`, `reports/query`) now import from `@/lib/anthropic` instead of creating per-request clients with hardcoded model strings.
- **Tests:** `anthropic-config.test.ts` — verifies constant value and format

### I7. Inconsistent Auth on `/api/agreements/notify-expiring` — RESOLVED
- **File:** `src/app/api/agreements/notify-expiring/route.ts`
- **Fix applied:** Replaced session auth with CRON_SECRET pattern (matches `/api/trial/check-expiry`). Uses `createAdminClient()` instead of `createServerClient()`. Route excluded from middleware auth. DEPLOYMENT.md updated to document both cron endpoints under CRON_SECRET.
- **Tests:** Updated `agreements.test.ts` — CRON_SECRET enforcement, request parameter passing

---

## MINOR ISSUES (Fix when convenient) — ALL RESOLVED

### M1. Duplicate Auth Check Pattern — RESOLVED
- **Fix applied:** Created `src/lib/auth-helpers.ts` with `getAuthenticatedUser()` and `getAuthenticatedProfile()`. Returns `{ user }` or `{ user, profile }` on success, `{ error: NextResponse }` on failure. Applied to 12+ routes.

### M2. Duplicate Profile Lookup Pattern — RESOLVED
- **Fix applied:** `getAuthenticatedProfile(supabase, select?)` combines auth + profile lookup. Accepts custom select string for routes needing role, tier, etc.

### M3. Anthropic Client Created Per-Request — RESOLVED
- **Fix applied:** All 5 routes use `getAnthropicClient()` singleton from `src/lib/anthropic.ts`. Zero remaining `new Anthropic()` calls in route files.

### M4. Inconsistent Error Messages — RESOLVED
- **Fix applied:** Created `src/lib/errors.ts` with `ERRORS` constants. Applied `ERRORS.UNAUTHORIZED`, `ERRORS.PROFILE_NOT_FOUND`, `ERRORS.OWNER_REQUIRED`, `ERRORS.UPGRADE_REQUIRED` across routes.

### M5. Fire-and-Forget DB Operations — RESOLVED
- **Fix applied:** Wrapped `email_sent_at` update in `/api/agreements/send` and `price_history` insert in `/api/items` PATCH in try/catch with `console.error` logging.

### M6. Unused `request` Parameter — RESOLVED
- **Fix applied:** Removed unused `request` parameter from `/api/billing/portal` POST.

### M7. Network Stats Full Fetch — RESOLVED
- **Fix applied:** `/api/admin/network-stats` now runs two parallel queries: count-only for total records + `.eq('sold', true)` for sold records. No JS filtering.

### M8. Payouts O(n*m) In-Memory Grouping — RESOLVED
- **Fix applied:** Replaced `consignorItems = items.filter(i => i.consignor_id === id)` with a pre-built `Map<consignor_id, items[]>` for O(n+m) grouping.

---

## CLAUDE.MD UPDATES NEEDED

### Outdated Information
1. **Line 119**: "Feature gating in UI" list says markdown schedules (starter+) — verify this matches the definitive matrix (it does: markdown_schedule = starter in FEATURE_REQUIRED_TIER)
2. **Settings section**: Still references old Starter description as "free plan" in some contexts — these were already fixed in code but some CLAUDE.md text may be stale

### Missing Information
1. **No mention of** `/api/pricing/comps` and `/api/pricing/identify` having no explicit auth checks (protected only by middleware)
2. **No mention of** the reports query SQL injection risk
3. **Missing note** that solo tier pages have no server-side route guards (client-side nav hiding only)
4. **Missing note** about the N+1 sidebar fetch pattern as a known performance issue
5. **Should document** which `console.log` statements are intentional (error logging) vs debug leftovers

### Patterns Future Sessions Should Know
1. **Auth pattern**: Middleware handles basic auth, but each route should still call `getUser()` for defense-in-depth
2. **Tier enforcement**: Currently UI-only for most features. API routes need tier checks added.
3. **Performance**: Reports page is the heaviest page — any changes should consider pagination
4. **Stripe webhook**: Already handles email failures gracefully — maintain this pattern

---

## MISSING FEATURES FROM SPEC

### Not Yet Implemented
1. **Community Pricing Feed** — Feature gate exists (`community_pricing_feed`, Pro tier), but no API, UI, or implementation
2. **API Access** — Feature gate exists (`api_access`, Pro tier), but no public API endpoints or documentation
3. **Advanced Markdown Schedules** — Standard tier has "advanced" markdowns mentioned in matrix, but implementation is the same as Starter (hardcoded Day 31 = 25%, Day 46 = 50%)

### Partially Implemented
4. **Solo Pricer Inventory** — Items can be saved without `consignor_id`, but the inventory page is shared with shop owners. No solo-specific inventory columns (date added, status = archived)
5. **Bonus Lookup Purchase** — Stripe checkout for top-up exists, but no "Buy 50 more — $5" button on the main pricing page (only on solo dashboard and settings)

---

## TEST COVERAGE GAPS

### Components Without Tests (~30-40 estimated tests needed)
| Component | Estimated Tests | Priority |
|-----------|----------------|----------|
| SoloDashboard | 8 | HIGH — usage meter math, bar colors, reset date |
| TrialBanner | 4 | MEDIUM — days calc, color coding |
| TrialExpiredPage | 5 | MEDIUM — tier display, checkout buttons |
| SetupPasswordPage | 8 | HIGH — hash token parsing, validation |
| Sidebar (tier nav) | 4 | MEDIUM — solo vs full nav, expiring badge |

### Edge Cases Not Tested
| Scenario | Priority |
|----------|----------|
| Solo user hits 200/month limit (403 response) | HIGH — TESTED in `lookup-limits.test.ts` |
| Bonus lookups exhausted after monthly limit | HIGH — TESTED in `lookup-limits.test.ts` |
| Trial expires mid-session (layout redirect) | MEDIUM |
| Suspended/cancelled account lockout | MEDIUM |
| Monthly counter reset after 30 days | MEDIUM |
| `auth/setup-password` with expired/invalid token | MEDIUM |

### Routes Without Explicit Auth Tests
| Route | Has Auth? | Test Coverage |
|-------|-----------|---------------|
| `/api/pricing/comps` | NO | Tests exist but don't test auth |
| `/api/pricing/identify` | NO | Tests exist but don't test auth |
| `/api/help/search` | NO | Tests exist but don't test auth |

---

## SECURITY STRENGTHS

- Middleware auth flow well-implemented
- Service role client used only in admin/webhook contexts
- Stripe webhook signature verification solid
- No hardcoded secrets in source code
- `credentials: 'include'` on all client-side fetch calls
- RLS relied upon for multi-tenant data isolation
- Role-based access control enforced on settings/billing routes
- Superadmin checks consistently use service role client
- Password reset flow prevents user enumeration (always returns 200)

---

## SUMMARY METRICS

| Category | Critical | Important | Minor | Total |
|----------|----------|-----------|-------|-------|
| Security | 5 | 1 | 0 | 6 |
| Performance | 0 | 4 | 4 | 8 |
| Code Quality | 0 | 2 | 8 | 10 |
| Test Coverage | 0 | 0 | 6 | 6 |
| **Total** | **5** | **7** | **18** | **30** |
