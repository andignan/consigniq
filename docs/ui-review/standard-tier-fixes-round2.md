# Standard Tier UI Fixes — Round 2

## Fix 1 — Progress bar minimum width on consignor detail
- Applied `max(8px, ...)` to lifecycle progress bar on consignor detail page
- RESOLVED

## Fix 2 — Item description truncation
- Descriptions are not rendered in inventory list (only item name shown with CSS `truncate`)
- No change needed — truncation applies to item names, not descriptions
- N/A

## Fix 3 — Item Detail Report enable condition
- Changed disabled condition from `soldInPeriod.length === 0` to `items.length === 0`
- Report now activates whenever any items exist
- RESOLVED

## Fix 4 — Consignor Report dates format
- Changed from raw ISO `{selectedConsignor.intake_date}` to formatted `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`
- Applied to intake_date, expiry_date, grace_end_date in Consignor Report section
- Uses `T00:00:00` local time fix for correct date display
- RESOLVED

## Fix 5 — Payouts zero state color
- Total Owed: grey for $0, red for >$0
- Total Paid Out: grey for $0, emerald for >$0
- RESOLVED

## Fix 6 — Payouts empty state messaging
- Changed to "No payouts due yet. Mark items as sold to track what you owe each consignor."
- RESOLVED

## Fix 7 — Upgrade to Pro button color
- Changed from `bg-amber-600` to `bg-indigo-600` to match app primary button style
- Applied to both starter→pro and standard→pro upgrade buttons
- RESOLVED

## Fix 8 — Team Members remove and role change
- Added Owner/Staff role dropdown per team member (saves on change via PATCH `/api/settings/team/[userId]`)
- Added "Remove" button per member with confirmation (DELETE `/api/settings/team/[userId]`)
- Cannot remove yourself. Cannot remove last owner.
- New API: `/api/settings/team/[userId]` (PATCH role, DELETE member)
- RESOLVED

## Fix 9 — Location card shows address and phone
- LocationsTab now fetches full location data from `/api/locations`
- Shows address and phone inline below location name
- RESOLVED

## Fix 10 — Edit and Delete Consignor UI
- Created `ConsignorActions` client component with Edit form and Delete modal
- Edit: inline form with name, phone, email, notes → PATCH `/api/consignors/[id]`
- Delete: modal with case-insensitive name confirmation → DELETE `/api/consignors/[id]`
- Delete blocked if consignor has sold items (preserves payout history)
- On delete success: redirects to /dashboard/consignors
- RESOLVED
