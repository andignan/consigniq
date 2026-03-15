# Manual Test Plan — Subscription Cancellation Lifecycle

## Webhook: Subscription Deleted (User cancels via Stripe)
1. Cancel subscription in Stripe portal
2. Webhook fires → account transitions to `cancelled_grace`
3. `subscription_cancelled_at`, `cancelled_tier`, `subscription_period_end` set
4. User still has full tier access during grace period
5. Cancellation confirmation email sent to owner

## Grace Period
1. Log in as owner of cancelled_grace account → amber banner shows with period_end date
2. All features still accessible (consignors, reports, payouts)
3. "Resubscribe" button visible on banner
4. Staff user → banner says "Contact your account owner"

## Grace → Limited Transition
1. When `subscription_period_end` passes → on next dashboard load, account transitions to `cancelled_limited`
2. Orange banner: "[Tier] subscription ended on [date]. Your data is safe."
3. Only solo features accessible (Dashboard, Price Lookup, Inventory, Settings)
4. Consignors, Reports, Payouts pages blocked

## Resubscribe Flow
1. Click "Resubscribe" button on banner → Stripe checkout opens with previous tier
2. Complete checkout → webhook fires → account back to `paid`
3. All cancellation fields cleared
4. Full tier access restored
5. "Welcome back" email sent

## Payment Failed
1. Simulate failed payment → webhook `invoice.payment_failed`
2. Attempt 1-2: "Payment failed" email sent
3. Attempt 3+: "Final warning" email sent

## Grace Period Cron
1. POST `/api/billing/check-grace-periods` with CRON_SECRET
2. Finds accounts with period_end in 3 days → sends reminder email
3. Auto-transitions overdue cancelled_grace → cancelled_limited
4. Sends "access ended" email for transitioned accounts

## Edge Cases
1. Account with no stripe_customer_id → webhook logs warning, returns 200
2. Cancelled_limited user clicks blocked feature → sees resubscribe CTA (not upgrade CTA)
3. Admin can still override any state via /admin/accounts/[id]
