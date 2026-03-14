# Consignor Management Test Plan

## Scope
Consignor CRUD, list page, detail page, new consignor form, lifecycle status display.

## Happy Path
1. Navigate to `/dashboard/consignors`
2. Verify consignor list loads with lifecycle status badges
3. Click "New Consignor" — fill in name, phone, email, notes
4. Verify split defaults come from location settings (e.g., 60/40)
5. Verify agreement_days and grace_days auto-calculate expiry/grace dates
6. Submit — verify consignor appears in list
7. Click consignor card — verify detail page shows all fields and items

## Edge Cases
- [ ] Create consignor with minimum fields (name only, no phone/email/notes)
- [ ] Create consignor with custom split (e.g., 70/30 instead of location default)
- [ ] Consignor with 0 items shows empty state on detail page
- [ ] Lifecycle badge shows correct color: green (>14d), yellow (8-14d), orange (1-7d), red (grace), gray (donation eligible)
- [ ] Search/filter consignors by name
- [ ] Consignor list is scoped by location_id (staff sees only their location)

## Role Enforcement
- [ ] Both owner and staff can create consignors
- [ ] Consignors created by staff are scoped to their location

## API Tests (Automated)
- [ ] GET `/api/consignors?location_id=X` returns correct consignors
- [ ] GET without location_id returns 400
- [ ] POST with missing required fields returns 400
- [ ] POST attaches `created_by` from authenticated user
- [ ] GET `/api/consignors/[id]` returns single consignor
- [ ] PATCH `/api/consignors/[id]` updates consignor fields

## Mobile
- [ ] Consignor list cards stack vertically on mobile
- [ ] New consignor form is usable on mobile viewport
- [ ] ConsignorCard lifecycle progress bar renders correctly

## Current Status
- **Automated**: API route tests for GET, POST, validation, auth
- **Manual**: Requires running app with test data
