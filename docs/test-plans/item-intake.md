# Item Intake Test Plan

## Scope
IntakeQueue component, photo-based AI identification, multi-item queue, item creation via API.

## Happy Path
1. Navigate to `/dashboard/consignors/[id]/intake`
2. Add item row — enter name, select category, select condition
3. Upload photo — verify AI identifies item (name, category, condition, description auto-fill)
4. Add multiple items to queue
5. Submit all items — verify each is created with status "pending"
6. Navigate to inventory — verify new items appear under that consignor

## Edge Cases
- [ ] Submit with empty name shows validation error
- [ ] Submit with missing category or condition shows validation error
- [ ] Photo upload with unsupported format (PDF, GIF) shows error
- [ ] AI identification failure shows graceful error (doesn't block manual entry)
- [ ] Queue with 10+ items all submit successfully
- [ ] Duplicate item names are allowed (same consignor can have multiple similar items)
- [ ] Cancel/clear individual items from queue before submit
- [ ] Network failure during submit shows error and doesn't lose queue data

## Role Enforcement
- [ ] Both owner and staff can perform intake
- [ ] Items are created with correct `location_id`, `account_id`, `consignor_id`
- [ ] `created_by` is set to the authenticated user

## API Tests (Automated)
- [ ] POST `/api/items` creates item with status "pending"
- [ ] POST `/api/items` validates required fields
- [ ] POST `/api/items` returns 401 if unauthenticated
- [ ] POST `/api/pricing/identify` requires photo file
- [ ] POST `/api/pricing/identify` rejects invalid file types

## Mobile
- [ ] Intake form is usable on mobile viewport
- [ ] Photo upload works via mobile camera
- [ ] All fetch calls include `credentials: 'include'` (mobile Safari)
- [ ] Queue items are scrollable on small screens

## Current Status
- **Automated**: API route tests for item creation and pricing identify
- **Manual**: Requires running app with AI API keys configured
