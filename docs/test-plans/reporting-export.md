# Reporting & Export Test Plan

## Scope
Reports page with 13 sections, time period filtering, location toggle, CSV exports.

## Happy Path
1. Navigate to `/dashboard/reports`
2. Verify default period is 30 days
3. Click through period buttons: 7d, 30d, 90d, YTD, All Time
4. Verify metrics update with each period change
5. Owner: toggle location filter between "All Locations" and specific locations
6. Verify each of the 13 sections renders with data

## Sections to Verify
- [ ] **Store Performance**: revenue, store earnings, consignor payouts, items sold/donated
- [ ] **Pricing Performance**: avg days to sell, avg sale price, sell-through rate, full/markdown split
- [ ] **Inventory Snapshot**: active consignors, pending/priced counts, inventory value, expiring items
- [ ] **Activity Summary**: intake'd, priced, sold, donated, new consignors
- [ ] **Consignor Report**: searchable dropdown, lifecycle card, item table, payout slip CSV
- [ ] **Category Performance**: sortable table, click headers to sort, CSV export
- [ ] **Aging Inventory**: oldest items first, color-coded expiry, capped at 50 rows
- [ ] **Consignor Rankings**: sortable comparative table, CSV export
- [ ] **Weekly Ops Summary**: fixed 7-day, week-over-week % change arrows
- [ ] **Markdown Effectiveness**: stat cards, breakdown by markdown %, CSV export
- [ ] **Pricing Accuracy**: AI vs actual, within/above/below range stats, CSV export
- [ ] **Payout Reconciliation**: all-time ledger, stubbed paid tracking, totals footer
- [ ] **Donation & Tax**: grouped by consignor, FMV documentation, CSV export

## CSV Exports
- [ ] Payout Report downloads as `consigniq-payouts-{period}-{date}.csv`
- [ ] Item Detail Report downloads as `consigniq-item-detail-{period}-{date}.csv`
- [ ] Donation Report downloads as `consigniq-donations-{date}.csv`
- [ ] Consignor Payout Slip downloads as `consigniq-consignor-{name}-{date}.csv`
- [ ] Category Performance CSV exports correctly
- [ ] Aging Inventory CSV includes all items (not just top 50)
- [ ] Consignor Rankings CSV exports correctly
- [ ] Markdown Effectiveness CSV exports correctly
- [ ] Pricing Accuracy CSV exports correctly
- [ ] Payout Reconciliation CSV exports correctly
- [ ] Donation & Tax CSV exports correctly
- [ ] CSV values are properly quoted/escaped (commas, quotes in names)

## Edge Cases
- [ ] Empty state (no items/consignors) shows graceful messages
- [ ] Period with no sold items shows $0 revenue, 0 avg days
- [ ] Sell-through rate handles 0 denominator
- [ ] Weekly Ops handles 0 last week (shows +100% or 0% appropriately)
- [ ] Sortable tables toggle between asc/desc on repeated clicks
- [ ] Aging inventory handles items with no consignor expiry
- [ ] Pricing accuracy handles items with no AI price data

## Role Enforcement
- [ ] Owner sees location toggle and can filter by location
- [ ] Staff sees only their location's data (no location toggle)

## Mobile
- [ ] Reports page is scrollable on mobile
- [ ] Tables scroll horizontally on small screens
- [ ] Period buttons scroll horizontally
- [ ] CSV download works on mobile

## Current Status
- **Automated**: None (reports are pure client-side computation)
- **Manual**: Full verification of 13 sections + 11 CSV exports
