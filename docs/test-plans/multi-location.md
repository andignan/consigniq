# Multi-Location Support Test Plan

## Scope
Location switcher in sidebar, owner cross-location dashboard, location management in settings, data scoping by location, staff lockdown.

## Happy Path — Location Switcher
1. Log in as an owner with 2+ locations
2. Verify location switcher dropdown appears in sidebar below "ConsignIQ" brand
3. Verify current active location name is displayed
4. Click dropdown — verify "All Locations" option appears first, followed by each location
5. Select a different location — verify data updates across all pages
6. Verify active location persists across page navigation (stored in localStorage)
7. Verify active location shows checkmark in dropdown
8. Refresh page — verify same location is still active
9. Log in as staff user — verify location is shown as static text (no dropdown)

## Happy Path — Owner Cross-Location Dashboard
1. Select "All Locations" in the location switcher
2. Navigate to `/dashboard`
3. Verify aggregate stat cards: Total Active Consignors, Needs Pricing, Total Inventory Value, Total Sold
4. Verify stat cards show "across N locations" sub-text
5. Verify "By Location" section shows a card per location
6. Verify each location card shows: consignors, pending, inventory value, sold counts
7. Verify lifecycle alerts show across all locations (expiring, grace, donation eligible)
8. Switch back to a single location — verify dashboard shows single-location view with clickable stat cards

## Happy Path — Location Management
1. Navigate to `/dashboard/settings`
2. Verify "Locations" tab appears between "Location Settings" and "Account Settings" (owner only)
3. Click "Locations" tab — verify all locations listed with name, pin icon, active badge
4. Click "Add Location" — verify new location form appears
5. Fill in: name (required), address, city, state, phone
6. Verify split % fields default to 60/40 with live validation
7. Set agreement days, grace days, markdown toggle
8. Click "Create Location" — verify location appears in list
9. Click "Edit" on a location — verify switches to Location Settings tab with that location loaded

## Happy Path — Data Scoping
1. Create consignors and items at Location A
2. Switch to Location B — verify Location A data is not visible
3. Navigate to Inventory — verify only Location B items show
4. Navigate to Consignors — verify only Location B consignors show
5. Navigate to Reports — verify stats are for Location B only
6. Switch to "All Locations" — verify Reports shows aggregate data

## Edge Cases
- [ ] Owner with only 1 location — switcher shows but "All Locations" still available
- [ ] Staff user cannot see location switcher dropdown (static display only)
- [ ] Staff user cannot access other locations via URL manipulation (`?location_id=other`)
- [ ] Location switcher dropdown closes when clicking outside
- [ ] Location switcher dropdown closes when selecting an option
- [ ] Mobile header shows active location name next to "ConsignIQ"
- [ ] Creating a location with empty name is rejected (400)
- [ ] Creating a location with splits that don't add to 100 — button disabled
- [ ] "All Locations" view on consignors page shows all consignors across account
- [ ] New location defaults: 60/40 split, 60 agreement days, 3 grace days, markdown disabled
- [ ] Active location badge shows on the correct location in settings
- [ ] Switching locations updates the URL with `?location_id=xxx`
- [ ] localStorage persistence survives browser restart

## Role Enforcement
- [ ] Staff: locked to assigned location_id, cannot switch
- [ ] Staff: does not see location switcher dropdown
- [ ] Staff: does not see "Locations" tab in settings
- [ ] Owner: can switch between all locations + "All Locations"
- [ ] Owner: can create new locations
- [ ] Owner: can edit any location in their account
- [ ] API: POST `/api/locations` returns 403 for staff
- [ ] API: GET `/api/locations` returns all account locations for any authenticated user

## API Tests (Automated)
- [ ] GET `/api/locations` returns 401 unauthenticated
- [ ] GET `/api/locations` returns 404 if profile not found
- [ ] GET `/api/locations` returns locations for authenticated user
- [ ] POST `/api/locations` returns 401 unauthenticated
- [ ] POST `/api/locations` returns 403 for staff role
- [ ] POST `/api/locations` returns 400 without name
- [ ] POST `/api/locations` creates location with valid data and correct defaults
- [ ] POST `/api/locations` uses custom split/agreement/grace values when provided

## Mobile
- [ ] Location switcher works in mobile sidebar overlay
- [ ] Mobile header bar shows active location name
- [ ] Locations tab in settings is usable on mobile viewport
- [ ] New location form inputs are full-width on mobile
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: 8 API tests for `/api/locations` (GET + POST, validation, role enforcement)
- **Manual**: Full UI workflow verification required with multi-location account
