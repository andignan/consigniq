# Inventory Management Test Plan

## Scope
Inventory list page, status filtering, search, category filter, consignor filter, edit/sell/donate modals, CSV export.

## Happy Path
1. Navigate to `/dashboard/inventory`
2. Verify items load filtered by user's location
3. Click status tabs: All, Pending, Priced, Sold, Donated
4. Search by item name — verify results filter
5. Filter by category dropdown
6. Filter by consignor dropdown
7. Click item → Edit modal → update name/category → Save
8. Click item → Mark Sold → enter sold_price → Confirm
9. Click item → Mark Donated → Confirm
10. Click CSV export — verify file downloads with correct data

## Edge Cases
- [ ] Empty inventory shows "No items" state
- [ ] Search with no results shows empty state
- [ ] Filters persist in URL params (can be bookmarked/shared)
- [ ] Clearing filters resets to show all items
- [ ] Selling item auto-sets `sold_date` to today
- [ ] Donating item auto-sets `donated_at` to current timestamp
- [ ] Pricing item auto-sets `priced_at` and status to "priced"
- [ ] CSV filename includes active filters (e.g., `inventory-priced-2026-03-13.csv`)
- [ ] Items from other locations are NOT visible (multi-tenancy)
- [ ] Consignor filter dropdown only shows consignors from current location

## Role Enforcement
- [ ] Staff user sees only items from their location
- [ ] Owner user sees items from selected location (or all if "All Locations" via reports)

## API Tests (Automated)
- [ ] GET `/api/items` supports `location_id`, `status`, `category`, `consignor_id`, `search` filters
- [ ] GET `/api/items?id=X` returns single item
- [ ] PATCH `/api/items` auto-sets timestamps for sold/donated/priced
- [ ] PATCH `/api/items` returns 400 without id

## Mobile
- [ ] Inventory list is scrollable on mobile
- [ ] Status tabs scroll horizontally on small screens
- [ ] Edit/sell/donate modals are usable on mobile viewport
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: API route tests for GET/POST/PATCH with filters and auto-timestamps
- **Manual**: UI interactions require running app
