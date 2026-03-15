# Manual Test Plan — Account Deletion

## Suspend Account
1. Navigate to /admin/accounts/[id] for an active account
2. Click "Suspend Account" → confirmation modal appears
3. Modal says "Users will lose access immediately but all data is preserved"
4. Click "Suspend" → account status changes to "suspended"
5. Verify the suspended user cannot access /dashboard

## Delete Complimentary/Trial Account
1. Navigate to /admin/accounts/[id] for a complimentary or trial account
2. Click "Delete Account" → modal shows "permanently delete all data immediately"
3. Type the account name to confirm
4. Click "Delete Account" → redirects to /admin/accounts
5. Verify account no longer appears in the list
6. Verify user cannot log in

## Delete Paid Account (with Stripe)
1. Navigate to /admin/accounts/[id] for a paid account with stripe_customer_id
2. Click "Delete Account" → modal shows "cancel their Stripe subscription and schedule data deletion"
3. Type account name, optionally enter a reason
4. Click "Delete Account" → account status changes to "deleted"
5. Verify Stripe subscription is cancelled in Stripe dashboard
6. Verify user cannot access /dashboard

## Delete Paid Account (no Stripe)
1. Navigate to /admin/accounts/[id] for a paid account without stripe_customer_id
2. Click "Delete Account" → modal shows "schedule data deletion in 30 days"
3. Complete deletion flow → account soft deleted

## Validation
1. Try clicking Delete without typing account name → button stays disabled
2. Delete button requires exact account name match (case-sensitive)
3. Non-superadmin cannot access the deletion API (returns 403)
