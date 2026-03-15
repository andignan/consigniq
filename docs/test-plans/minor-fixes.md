# Manual Test Plan — 18 MINOR Issue Fixes

## M1/M2 — Auth Helper Refactor
1. Log in as owner → all pages load normally (consignors, inventory, pricing, reports, payouts, settings)
2. Log in as staff → location-restricted pages load correctly, owner-only features blocked
3. Log out → API calls return 401, dashboard redirects to login

## M4 — Consistent Error Messages
1. Trigger 401 (logged out API call) → message says "Unauthorized"
2. Trigger 403 on solo tier (visit /dashboard/consignors) → redirected to /dashboard
3. Trigger 403 on billing (staff user) → message mentions owner requirement

## M5 — Fire-and-Forget Error Handling
1. Send agreement email → verify email_sent_at is updated
2. Sell an item → verify price_history record is created
3. Check server logs → no uncaught promise rejections

## M6 — Unused Request Parameter
1. Click "Manage Billing" → Stripe portal opens (no regression)

## M7 — Network Stats Fix
1. Log in as superadmin → /admin stats load correctly
2. Verify sold_items count matches actual sold records (not total records)

## M8 — Payouts Grouping
1. Navigate to /dashboard/payouts → consignors with sold items display correctly
2. Verify split calculations are accurate
3. Mark items as paid → status updates correctly
