# Payouts Test Plan

## Scope
Payouts page (`/dashboard/payouts`), consignor payout tracking, split calculations, Mark as Paid, CSV export, sidebar badge for expiring consignors.

## Happy Path — Viewing Payouts
1. Navigate to `/dashboard/payouts`
2. Verify summary cards show: Total Owed (Unpaid), Total Paid Out, Consignors with Balance
3. Verify consignor list shows consignors with sold items
4. Click a consignor row to expand — verify item list with: name, category, sold date, sold price, consignor share
5. Verify split calculation: consignor share = sold_price * (split_consignor / 100)
6. Verify store share = sold_price * (split_store / 100)

## Happy Path — Mark as Paid
1. On Payouts page with filter set to "Unpaid"
2. Expand a consignor with unpaid items
3. Select one or more items via checkboxes
4. Verify bulk action bar appears with item count and optional note field
5. Enter payout note (e.g., "Check #123")
6. Click "Mark as Paid"
7. Verify items move from unpaid to paid (green check icon, "Paid" badge)
8. Verify `paid_at` timestamp is set in items table
9. Verify `payout_note` is stored
10. Verify summary cards update accordingly

## Happy Path — Select All Unpaid
1. Expand a consignor with multiple unpaid items
2. Click "Select all unpaid" button
3. Verify all unpaid items are checked
4. Click again to deselect all
5. Verify all items are unchecked

## Happy Path — Filters
1. Click "Unpaid" tab — verify only consignors with unpaid items shown
2. Click "Paid" tab — verify only consignors with paid items shown
3. Click "All" tab — verify all consignors with sold items shown

## Happy Path — CSV Export
1. Click "Export CSV" button
2. Verify CSV downloads with columns: Consignor, Item, Category, Sold Price, Sold Date, Split %, Consignor Share, Store Share, Paid At, Note
3. Verify data matches displayed payouts

## Happy Path — Expiring Consignor Badge
1. With consignors expiring within 7 days or in grace period
2. Verify amber badge appears on "Consignors" nav item in sidebar
3. Verify badge count matches number of expiring/grace consignors
4. Verify badge is scoped to active location (or all locations for owners)
5. Verify badge updates when switching locations

## Edge Cases
- [ ] No sold items — payouts page shows empty state
- [ ] Consignor with all items already paid — not shown on "Unpaid" filter
- [ ] Items with null sold_price — treated as $0 in calculations
- [ ] Split percentages that don't divide evenly — rounded to 2 decimal places
- [ ] Very long consignor name — truncated in list
- [ ] No expiring consignors — badge does not appear on sidebar
- [ ] Marking items as paid when another user marks same items — last write wins

## Role Enforcement
- [ ] Both owner and staff can view payouts
- [ ] Both owner and staff can mark items as paid
- [ ] Payouts scoped by account_id — cannot see other accounts' data
- [ ] API returns 401 for unauthenticated requests
- [ ] API returns 404 if user profile not found

## API Tests (Automated)
- [ ] GET `/api/payouts` returns 401 unauthenticated
- [ ] GET `/api/payouts` returns 404 if profile not found
- [ ] GET `/api/payouts` returns empty when no consignors
- [ ] GET `/api/payouts` filters by location_id
- [ ] GET `/api/payouts` filters by unpaid status (is null)
- [ ] GET `/api/payouts` filters by paid status (not null)
- [ ] GET `/api/payouts` returns split calculations
- [ ] PATCH `/api/payouts` returns 401 unauthenticated
- [ ] PATCH `/api/payouts` returns 400 without item_ids
- [ ] PATCH `/api/payouts` returns 400 with empty item_ids
- [ ] PATCH `/api/payouts` marks items with paid_at timestamp
- [ ] PATCH `/api/payouts` includes payout_note when provided
- [ ] PATCH `/api/payouts` omits payout_note when not provided

## Database Migration
- Migration `20260314060000_add_payout_fields.sql` adds `paid_at` (timestamptz, nullable) and `payout_note` (text, nullable) to items table
- Verify columns exist after running migration
- Verify existing items have NULL for both fields

## Mobile
- [ ] Payouts page is responsive on mobile viewport
- [ ] Summary cards stack vertically on mobile
- [ ] Consignor accordion works on touch
- [ ] CSV export works on mobile
- [ ] Sidebar badge visible when mobile menu opened

## Current Status
- **Automated**: 13 API tests for `/api/payouts` (GET + PATCH)
- **Manual**: Full UI workflow verification required
