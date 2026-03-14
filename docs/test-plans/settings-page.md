# Settings Page Test Plan

## Scope
Location settings, account settings, team management, invite flow, role-based access.

## Happy Path — Location Settings
1. Navigate to `/dashboard/settings`
2. Verify Location Settings tab is active by default
3. Verify fields populate from current location: name, address, city, state, phone
4. Verify split % fields show current defaults (e.g., 60/40)
5. Change store split to 70 — verify consignor auto-updates to 30
6. Change consignor split to 50 — verify store auto-updates to 50
7. Verify live validation shows "= 100%" in green
8. Change agreement_days and grace_days
9. Toggle markdown_enabled — verify schedule display appears/disappears
10. Click Save — verify success message
11. Refresh page — verify saved values persist

## Happy Path — Account Settings (Owner Only)
1. Click Account Settings tab
2. Verify account name loads
3. Change account name → Save → verify persistence
4. Verify tier badge displays (read-only)
5. Verify Manage Billing button links to `/api/billing/portal`
6. Verify team member list shows all users on account
7. Click "Invite User" → enter email and select role → Send
8. Verify invitation appears in pending invitations list

## Edge Cases
- [ ] Split values that don't add to 100 show red validation error
- [ ] Save button is disabled until changes are made
- [ ] Save button is disabled if splits don't add to 100
- [ ] Agreement days set to 0 or negative is handled
- [ ] Grace days set to 0 is valid (no grace period)
- [ ] Empty location name shows validation concern
- [ ] Invite with empty email is rejected
- [ ] Invite with invalid role is rejected (API returns 400)
- [ ] Invite for existing user shows "already exists" error (409)
- [ ] Pending invitation shows expiry date
- [ ] Account name save is independent of location save

## Role Enforcement
- [ ] **Staff**: sees Location Settings tab only — all fields are disabled/read-only
- [ ] **Staff**: does NOT see Account Settings tab
- [ ] **Staff**: sees "Only account owners can edit" message
- [ ] **Owner**: can edit all Location Settings fields
- [ ] **Owner**: sees both tabs
- [ ] **Owner**: can invite users with owner or staff role
- [ ] API: PATCH `/api/settings/location` returns 403 for staff
- [ ] API: GET `/api/settings/account` returns 403 for staff
- [ ] API: POST `/api/settings/invite` returns 403 for staff

## API Tests (Automated)
- [ ] GET `/api/settings/location` returns 401 unauthenticated
- [ ] GET `/api/settings/location` returns 400 without location_id
- [ ] PATCH `/api/settings/location` returns 403 for staff role
- [ ] GET `/api/settings/account` returns 403 for staff role
- [ ] POST `/api/settings/invite` returns 400 without email/role
- [ ] POST `/api/settings/invite` returns 400 for invalid role
- [ ] POST `/api/settings/invite` returns 403 for staff role

## Mobile
- [ ] Settings page is usable on mobile viewport
- [ ] Tab switching works on mobile
- [ ] Form inputs are full-width on mobile
- [ ] Invite modal is centered and usable on mobile
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: API role enforcement tests for all 3 settings endpoints
- **Manual**: Full UI workflow verification required
