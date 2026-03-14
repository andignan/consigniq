# Multi-Tenancy & Data Isolation Test Plan

## Scope
Account and location scoping, RLS enforcement, cross-tenant data isolation, owner vs staff data access.

## Happy Path
1. Log in as a staff user assigned to Location A
2. Navigate to `/dashboard` — verify only Location A's consignors and items appear
3. Navigate to `/dashboard/consignors` — verify list is scoped to Location A
4. Navigate to `/dashboard/inventory` — verify items are scoped to Location A
5. Navigate to `/dashboard/reports` — verify stats reflect Location A only
6. Log out and log in as an owner user
7. Navigate to `/dashboard/reports` — verify location toggle is visible (owner only)
8. Switch location in reports — verify data updates to selected location

## Data Isolation
- [ ] Staff user at Location A cannot see consignors from Location B
- [ ] Staff user at Location A cannot see items from Location B
- [ ] API call to `/api/consignors?location_id=<other-location>` returns empty or 403 (RLS blocks)
- [ ] API call to `/api/items?location_id=<other-location>` returns empty or 403 (RLS blocks)
- [ ] Creating a consignor attaches the user's location_id automatically
- [ ] Creating an item attaches the user's location_id and account_id automatically
- [ ] Dashboard stats only count items/consignors for the active location
- [ ] Reports data only includes records for the active location

## Owner Cross-Location Access
- [ ] Owner can see reports across all locations via location toggle
- [ ] Owner can access settings for any location under their account
- [ ] Owner's dashboard still scopes to a single location (not all locations combined)

## UserContext & location_id
- [ ] `useUser()` hook provides the correct `location_id` from the authenticated profile
- [ ] Client components use `location_id` from UserContext, not hardcoded values
- [ ] Dashboard page reads `location_id` from query params or falls back to `DEFAULT_LOCATION_ID`
- [ ] All client-side `fetch()` calls pass `location_id` as a query parameter

## RLS Policy Enforcement (Database Level)
- [ ] `consignors` table RLS: users can only read/write rows matching their `account_id`
- [ ] `items` table RLS: users can only read/write rows matching their `account_id`
- [ ] `locations` table RLS: users can only read locations under their `account_id`
- [ ] `users` table RLS: users can read other users in their `account_id` (for team list)
- [ ] `invitations` table RLS: only account owners can read/write invitations

## Edge Cases
- [ ] User with no location_id assigned — should fail gracefully, not show data from other tenants
- [ ] `DEFAULT_LOCATION_ID` env var missing — dashboard should handle gracefully
- [ ] User removed from account — session should be invalidated or data access denied
- [ ] Location deleted — items/consignors for that location still exist but are inaccessible

## Mobile
- [ ] Location scoping works identically on mobile (same APIs, same cookies)
- [ ] `credentials: 'include'` on all fetch calls ensures session cookie is sent on mobile Safari

## Current Status
- **Automated**: API route tests validate auth (401 for unauthenticated), but do not test cross-tenant isolation
- **Manual**: Requires two test accounts with separate locations to verify full isolation
- **Database**: RLS policies must be verified directly in Supabase Dashboard or via SQL queries
