# ConsignIQ Code Review — March 2026

**Date:** 2026-03-15
**Reviewer:** Claude Code (Opus 4.6)
**Codebase:** 260 tests passing, 26 test files, ~50 source files
**Scope:** Security, code quality, tier gates, test coverage, performance, CLAUDE.md accuracy

---

## CRITICAL ISSUES (Must fix before real customers)

### C1. SQL Injection in Reports Query Route
- **File:** `src/app/api/reports/query/route.ts`, lines 90, 93, 118-119
- **Issue:** `location_id` and `account_id` are directly interpolated into SQL strings without UUID validation:
  ```typescript
  locationFilter = ` AND location_id = '${profile.location_id}'`
  sql = sql.replace(/'\[ACCOUNT_ID_PLACEHOLDER\]'/g, `'${profile.account_id}'`)
  ```
- **Attack:** `POST /api/reports/query { "question": "...", "location_id": "' OR '1'='1" }` bypasses location scoping
- **Fix:** Validate that `location_id` and `account_id` are valid UUIDs before interpolation

### C2. Missing Authentication on `/api/pricing/comps`
- **File:** `src/app/api/pricing/comps/route.ts`
- **Issue:** No `supabase.auth.getUser()` check. Middleware protects `/api/*` routes, but this route has no explicit auth verification after middleware passes the request.
- **Risk:** If middleware is bypassed or misconfigured, unauthenticated users can make unlimited SerpApi requests
- **Fix:** Add auth check at top of handler

### C3. Missing Authentication on `/api/pricing/identify`
- **File:** `src/app/api/pricing/identify/route.ts`
- **Issue:** Same as C2 — no auth check. Unauthenticated photo identification via Anthropic API.
- **Fix:** Add auth check at top of handler

### C4. No Server-Side Route Guards for Solo Tier
- **Files:** `src/app/dashboard/consignors/page.tsx`, `src/app/dashboard/reports/page.tsx`, `src/app/dashboard/payouts/page.tsx`
- **Issue:** Solo users can navigate directly to `/dashboard/consignors`, `/dashboard/reports`, `/dashboard/payouts` via URL. Sidebar hides these links (client-side only), but there's no server-side check.
- **Risk:** Solo users can access Starter+ features by knowing the URL
- **Fix:** Add tier check in each page's server component — redirect to `/dashboard` if solo

### C5. No Tier Enforcement on API Routes
- **Files:** `/api/consignors`, `/api/agreements/send`, `/api/payouts`, `/api/locations` (POST)
- **Issue:** These API routes check role (owner/staff) but NOT tier. A solo user who crafts API requests can create consignors, send agreements, process payouts.
- **Fix:** Add `canUseFeature(tier, 'consignor_mgmt')` checks to these routes

---

## IMPORTANT ISSUES (Fix soon)

### I1. N+1 Query in Sidebar Expiring Consignor Badge
- **File:** `src/components/layout/Sidebar.tsx`, lines 126-160
- **Issue:** For "All Locations" view, makes sequential HTTP requests per location:
  ```typescript
  for (const lid of fetchLocations) {
    const res = await fetch(`/api/consignors?location_id=${lid}`, ...)
  }
  ```
- **Impact:** 5 locations = 5 sequential API calls on every page load
- **Fix:** Create a single endpoint `/api/consignors/expiring-count` or fetch by `account_id`

### I2. Reports Page Loads Entire Dataset Client-Side
- **File:** `src/app/dashboard/reports/page.tsx`, lines 282-309
- **Issue:** Fetches ALL items and consignors for the account with no pagination, then filters in JavaScript (800+ filter operations). For accounts with 10,000+ items, this causes memory spikes.
- **Fix:** Implement server-side aggregations or pagination

### I3. Admin Stats Fetches All Records Instead of COUNT()
- **File:** `src/app/api/admin/stats/route.ts`, lines 17-22
- **Issue:** Fetches entire `accounts`, `locations`, `users`, `items`, `consignors` tables then counts in JS
- **Fix:** Replace with Supabase `.select('*', { count: 'exact', head: true })` or RPC aggregation

### I4. Missing Database Indexes
- **Files:** `supabase/migrations/` — no CREATE INDEX statements found in any migration
- **Missing indexes on frequently filtered columns:**
  - `(account_id, status)` on items, consignors
  - `(account_id, location_id)` on items, consignors
  - `(location_id, status)` on items
  - `(account_id)` on price_history, users, locations
  - `(stripe_customer_id)` on accounts (webhook lookups)
- **Fix:** Create migration with composite indexes

### I5. Debug Console.logs in Production Code
- **File:** `src/app/api/pricing/comps/route.ts` — 8+ `console.log` statements for debug output (search query, SerpApi URL, result counts)
- **File:** `src/app/dashboard/inventory/[id]/price/page.tsx` — 5 `console.log` statements
- **File:** `src/app/dashboard/pricing/page.tsx` — 1 `console.log`
- **Fix:** Remove debug logs or replace with structured logger

### I6. Anthropic Model Name Hardcoded in 5 Routes
- **Files:** `help/search`, `pricing/identify`, `pricing/suggest`, `pricing/cross-account`, `reports/query`
- **Issue:** `'claude-sonnet-4-20250514'` hardcoded in each route
- **Fix:** Extract to `src/lib/anthropic.ts` as a constant: `export const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'`

### I7. Inconsistent Auth on `/api/agreements/notify-expiring`
- **File:** `src/app/api/agreements/notify-expiring/route.ts`
- **Issue:** Uses session auth, but designed for cron invocation. Should use `CRON_SECRET` pattern like `/api/trial/check-expiry`
- **Fix:** Add CRON_SECRET support or document as user-triggered

---

## MINOR ISSUES (Fix when convenient)

### M1. Duplicate Auth Check Pattern (15+ routes)
- Every API route has the same 5 lines: `createServerClient()` → `auth.getUser()` → check error → return 401
- **Fix:** Extract to a shared `getAuthenticatedUser()` helper

### M2. Duplicate Profile Lookup Pattern (8+ routes)
- Every route fetches user profile the same way after auth
- **Fix:** Extract to `getAuthenticatedProfile()` combining auth + profile lookup

### M3. Anthropic Client Created Per-Request (5 routes)
- Each route creates `new Anthropic({ apiKey: ... })`
- **Fix:** Create singleton in `src/lib/anthropic.ts` like `src/lib/stripe.ts`

### M4. Inconsistent Error Messages
- "Profile not found" vs "User profile not found" across routes
- **Fix:** Centralize error message constants

### M5. Fire-and-Forget DB Operations Without Error Handling
- `src/app/api/agreements/send/route.ts` line 123: email_sent_at update has no error handling
- `src/app/api/items/route.ts` line 124: price_history insert on sold has no error handling
- **Fix:** Add `.catch()` or wrap in try/catch for these background ops

### M6. Unused `request` Parameter
- `src/app/api/billing/portal/route.ts` line 5: `request` param not used
- **Fix:** Remove parameter

### M7. Network Stats Fetches All price_history Without Filter
- `src/app/api/admin/network-stats/route.ts` line 17: Fetches all records, filters `sold === true` in JS
- **Fix:** Add `.eq('sold', true)` to query

### M8. Payouts API Uses O(n*m) In-Memory Grouping
- `src/app/api/payouts/route.ts` line 71: Loops over consignors and filters items array for each
- **Fix:** Use database JOIN/GROUP BY instead

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
| Solo user hits 200/month limit (403 response) | HIGH |
| Bonus lookups exhausted after monthly limit | HIGH |
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
