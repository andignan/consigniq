# Admin Page Test Plan

## Scope
Superadmin-only `/admin` route with overview dashboard, customer accounts list, account detail with tier/status management.

## Happy Path — Access Control
1. Log in as `admin@getconsigniq.com` (platform_role = 'super_admin')
2. Navigate to `/admin` — verify admin overview loads with stats
3. Log out, log in as a regular owner user
4. Navigate to `/admin` — verify redirect to `/dashboard`
5. Log out, log in as a staff user
6. Navigate to `/admin` — verify redirect to `/dashboard`

## Happy Path — Admin Overview
1. Navigate to `/admin`
2. Verify top-level stat cards: Accounts, Locations, Users, Items, Consignors
3. Verify "Accounts by Tier" breakdown (starter/standard/pro) with bars
4. Verify "Account Status" breakdown (active/suspended/cancelled)
5. Verify "Items by Status" breakdown (pending/priced/sold/donated)
6. Verify "Consignors by Status" breakdown (active/expired/grace/closed)
7. Verify all counts are cross-account (not scoped to any single account)

## Happy Path — Accounts List
1. Navigate to `/admin/accounts`
2. Verify table shows all accounts with: name, tier, status, location count, user count, created date
3. Select "Pro" tier filter — verify only pro accounts shown
4. Select "Active" status filter — verify only active accounts shown
5. Clear filters — verify all accounts return
6. Click a row — verify navigates to `/admin/accounts/[id]`

## Happy Path — Account Detail
1. Click an account from the list
2. Verify account info: name, created date, Stripe ID
3. Verify tier dropdown shows current tier
4. Change tier to "pro" → click Save → verify success message
5. Verify status dropdown shows current status
6. Change status to "suspended" → click Save → verify success message
7. Verify locations list shows all locations for this account
8. Verify users list shows all users with their roles
9. Verify item counts by status (pending/priced/sold/donated)

## Happy Path — Admin Navigation
1. Verify sidebar shows: Overview, Accounts links
2. Verify logged-in admin email displayed at top of sidebar
3. Verify Shield icon and "Admin" branding (not "ConsignIQ")
4. Click "Back to App" — verify navigates to `/dashboard`
5. Verify active nav item highlighted in red

## Edge Cases
- [ ] Non-superadmin user accessing `/admin` via direct URL → redirect to `/dashboard`
- [ ] Unauthenticated user accessing `/admin` → redirect to `/auth/login`
- [ ] API `/api/admin/stats` returns 403 for non-superadmin
- [ ] API `/api/admin/accounts` returns 403 for non-superadmin
- [ ] PATCH with invalid tier (e.g., "enterprise") returns 400
- [ ] PATCH with invalid status (e.g., "deleted") returns 400
- [ ] PATCH without id returns 400
- [ ] Save button disabled when tier/status hasn't changed
- [ ] Account with 0 locations/users shows "No locations" / "No users" text
- [ ] Tier/status change persists on page refresh

## API Tests (Automated)
- [ ] GET `/api/admin/stats` returns 401 unauthenticated
- [ ] GET `/api/admin/stats` returns 403 for non-superadmin
- [ ] GET `/api/admin/stats` returns cross-account stats for superadmin
- [ ] GET `/api/admin/accounts` returns 401 unauthenticated
- [ ] GET `/api/admin/accounts` returns 403 for non-superadmin
- [ ] GET `/api/admin/accounts` lists accounts for superadmin
- [ ] GET `/api/admin/accounts?tier=pro` filters by tier
- [ ] GET `/api/admin/accounts?status=active` filters by status
- [ ] PATCH `/api/admin/accounts` returns 401 unauthenticated
- [ ] PATCH `/api/admin/accounts` returns 403 for non-superadmin
- [ ] PATCH `/api/admin/accounts` returns 400 without id
- [ ] PATCH `/api/admin/accounts` updates tier
- [ ] PATCH `/api/admin/accounts` updates status
- [ ] PATCH `/api/admin/accounts` rejects invalid tier
- [ ] PATCH `/api/admin/accounts` rejects invalid status

## Mobile
- [ ] Admin sidebar works as mobile overlay with hamburger menu
- [ ] Mobile header shows Shield icon and "Admin" text
- [ ] Accounts table scrolls horizontally on mobile
- [ ] Account detail page stacks tier/status controls vertically
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: 15 API tests for admin stats + accounts (auth, role enforcement, CRUD, validation)
- **Manual**: Full UI workflow verification required with superadmin account
