# Manual Test Plan — 7 IMPORTANT Issue Fixes

## I1 — N+1 Sidebar Query Fix

### Setup
- Log in as an owner with multiple locations

### Tests
1. **Single endpoint called**: Open browser DevTools > Network tab. Navigate to any dashboard page. Verify only ONE call to `/api/consignors/expiring-count` (not multiple calls to `/api/consignors?location_id=...`)
2. **All Locations view**: Switch to "All Locations" in sidebar. Badge should show total count across all locations
3. **Single location**: Switch to a specific location. Badge should show count for that location only
4. **Solo user**: Log in as solo tier user. Verify no expiring-count API call is made

## I2 — Reports Page Pagination

### Tests
1. **Large dataset**: For an account with many items, verify reports page loads without browser memory spike
2. **Data completeness**: Verify all 13 report sections still render correctly with limited data
3. **Sort order**: Items should be sorted by intake_date descending (newest first)

## I3 — Admin Stats COUNT() Queries

### Setup
- Log in as superadmin

### Tests
1. **Stats load**: Navigate to /admin. Verify stats display correctly
2. **Performance**: In browser DevTools > Network, verify the stats API response is small (no full record data)
3. **Solo tier counted**: Verify `byTier` includes `solo` count
4. **All breakdowns present**: accounts (byTier, byStatus), items (byStatus), consignors (byStatus), locations total, users total

## I4 — Database Indexes

### Tests
1. **Migration runs**: Execute `20260315000000_add_performance_indexes.sql` in Supabase SQL Editor
2. **No errors**: All CREATE INDEX IF NOT EXISTS statements should succeed
3. **Indexes visible**: Run `\di` or query `pg_indexes` to verify all 9 indexes exist

## I5 — Debug Console.logs Removed

### Tests
1. **Comps route**: Search for an item price. Check server logs — no `[comps]` debug output
2. **Inventory pricing**: Price an item. Check browser console — no `[inventory-pricing]` debug output
3. **Error logging preserved**: Force an error (e.g., invalid API key). Verify `console.error` still fires

## I6 — Anthropic Model Constant

### Tests
1. **AI pricing works**: Price an item with AI — should return suggestion
2. **Help search works**: Use the help widget — AI should respond
3. **Reports AI works**: Type a question in the AI report prompt bar — should generate SQL and results
4. **Photo ID works**: Upload a photo for identification — should return item details
5. **Cross-account pricing**: (Pro tier) Verify market intelligence panel shows AI insight text

## I7 — Cron Auth on notify-expiring

### Tests
1. **Without CRON_SECRET**: Set no CRON_SECRET env var. POST to `/api/agreements/notify-expiring` — should work (open access)
2. **With CRON_SECRET**: Set `CRON_SECRET=test123`. POST without header — should return 401. POST with `Authorization: Bearer test123` — should return 200
3. **No session needed**: Verify the endpoint works without a logged-in user session (uses admin client)
