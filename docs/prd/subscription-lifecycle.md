# Subscription Lifecycle — Product Requirements Document

**Status:** Implemented
**Date:** 2026-03-15
**Scope:** Account states, cancellation flows, grace periods, resubscription, webhook handling

---

## Account States

| State | `account_type` | `status` | Access Level | Trigger |
|---|---|---|---|---|
| **active** | `paid` | `active` | Full tier access | Paying subscriber |
| **active** | `complimentary` | `active` | Full `complimentary_tier` access | Admin grants complimentary |
| **active** | `trial` | `active` | Full tier access | Trial not yet expired |
| **trial_expired** | `trial` | `active` | Locked (full-screen upgrade page) | `trial_ends_at` < now |
| **cancelled_grace** | `cancelled_grace` | `active` | Full tier access (was paying) | User cancels, within paid period |
| **cancelled_limited** | `cancelled_limited` | `active` | Solo tier features only | Past `subscription_period_end` |
| **suspended** | any | `suspended` | Locked (suspension page) | Admin suspends |
| **deleted** | any | `deleted` | Locked (account closed page) | Admin deletes |

### New Database Columns Required

```sql
ALTER TABLE accounts ADD COLUMN subscription_period_end timestamptz;
ALTER TABLE accounts ADD COLUMN subscription_cancelled_at timestamptz;
ALTER TABLE accounts ADD COLUMN cancelled_tier text;  -- tier at time of cancellation
```

### New `account_type` Values

Current: `paid`, `trial`, `complimentary`
Add: `cancelled_grace`, `cancelled_limited`

---

## State Transitions

```
                    ┌──────────────────────────────────────┐
                    │              active                   │
                    │  (paid, complimentary, or trial)      │
                    └─────┬───────┬───────┬───────┬────────┘
                          │       │       │       │
            user cancels  │       │       │       │  admin action
            in Stripe     │       │       │       │
                          ▼       │       │       ▼
                ┌─────────────┐   │       │  ┌──────────┐
                │ cancelled_  │   │       │  │suspended │
                │ grace       │   │       │  └────┬─────┘
                └──────┬──────┘   │       │       │
                       │          │       │       │ admin unsuspends
          period_end   │          │       │       │
          reached      │          │       │       ▼
                       ▼          │       │     active
                ┌─────────────┐   │       │
                │ cancelled_  │   │       │
                │ limited     │   │       │
                └──────┬──────┘   │       │
                       │          │       │
            resubscribe│          │       │
                       │          │       │
                       ▼          │       │
                     active       │       │
                                  │       │
                    trial expires │       │ admin deletes
                                  ▼       ▼
                          ┌──────────┐  ┌───────┐
                          │trial_    │  │deleted│
                          │expired   │  └───────┘
                          └────┬─────┘
                               │
                    subscribes │
                               ▼
                             active
```

### Transition Details

| From | To | Trigger | Action |
|---|---|---|---|
| active (paid) | cancelled_grace | `customer.subscription.deleted` webhook | Set `account_type='cancelled_grace'`, `subscription_cancelled_at=now`, `cancelled_tier=current tier`, `subscription_period_end=sub.current_period_end`. Send cancellation email. |
| cancelled_grace | cancelled_limited | Cron: `/api/billing/check-grace-periods` detects `subscription_period_end < now` | Set `account_type='cancelled_limited'`. Send "access ended" email. |
| cancelled_limited | active | `checkout.session.completed` webhook (resubscribe) | Set `account_type='paid'`, `tier=new_tier`, clear `subscription_cancelled_at`, `subscription_period_end`, `cancelled_tier`. Send welcome-back email. |
| active (trial) | trial_expired | Dashboard layout detects `trial_ends_at < now` | No DB change — layout renders `TrialExpiredPage`. |
| trial_expired | active | `checkout.session.completed` webhook | Set `account_type='paid'`, `tier=purchased_tier`. Send upgrade email. |
| active | suspended | Admin PATCH `status='suspended'` | Set `status='suspended'`. Send suspension email. |
| suspended | active | Admin PATCH `status='active'` | Set `status='active'`. |
| any | deleted | Admin POST `/api/admin/accounts/delete` | Complimentary/trial: hard delete all data. Paid: soft delete (`status='deleted'`, `deleted_at=now`). |

---

## Stripe Webhook Events

### `checkout.session.completed`

1. Look up account via `metadata.account_id`
2. If `metadata.product === 'topup_50'`: add 50 to `bonus_lookups`, return
3. Read tier from metadata (only accepts `solo`, `shop`, `enterprise`)
4. Check if resubscription (`account_type` is `cancelled_grace` or `cancelled_limited`)
5. Set `tier`, `account_type='paid'`, clear `trial_ends_at`, `subscription_cancelled_at`, `subscription_period_end`, `cancelled_tier`
6. Send welcome-back email (resub) or upgrade email (new sub) using `TIER_CONFIGS` for label/price

### `customer.subscription.updated`

1. Look up account via `stripe_customer_id`
2. Sync `tier` from subscription metadata if available
3. Update `subscription_period_end` from `current_period_end`
4. If subscription status is `active` AND account is `cancelled_grace` or `cancelled_limited`: resubscribe via Stripe portal — set `account_type='paid'`, clear `subscription_cancelled_at`, `cancelled_tier`. Send welcome-back email.
5. If subscription status changed to `past_due`: log warning (payment retry in progress)

### `customer.subscription.deleted`

1. Look up account via `stripe_customer_id`
2. If no account found: log warning, return 200
3. Set `account_type = 'cancelled_grace'`
4. Set `subscription_cancelled_at = now()`
5. Set `cancelled_tier = current tier`
6. Set `subscription_period_end` from subscription's `current_period_end`
7. Do NOT change `tier` yet — user keeps access until `period_end`
8. Send cancellation confirmation email to owner

### `invoice.payment_failed`

1. Look up account via `stripe_customer_id`
2. Read `attempt_count` from the invoice object
3. If `attempt_count` <= 2: send "payment failed, please update payment method" email
4. If `attempt_count` >= 3: send "final warning — subscription will be cancelled" email
5. Do NOT suspend or cancel — let Stripe's retry logic handle it
6. If Stripe eventually gives up, it fires `customer.subscription.deleted` which triggers the cancellation flow

---

## Grace Period Rules

### cancelled_grace (within paid period)
- User has full access to their previous tier
- Amber banner: "Your subscription has been cancelled. You have access until [period_end date]. Resubscribe to keep your plan."
- Banner links to Stripe checkout for their previous tier
- No feature restrictions during grace period
- All data operations (intake, pricing, reports) continue working

### cancelled_limited (past period_end)
- User downgraded to Solo tier features only
- Persistent banner: "Your [tier] subscription ended on [date]. Resubscribe to restore full access."
- Solo-accessible features: Dashboard, Price Lookup (200/mo), My Inventory, Settings
- Blocked features show resubscribe message instead of UpgradePrompt: "Your [tier] subscription has ended. Resubscribe to access [feature]."
- Data is preserved indefinitely — items, consignors, reports all still in DB
- If user resubscribes, they get their data back with full access

### Data Preservation
- Cancelled accounts (grace or limited) keep ALL data indefinitely
- No automated data deletion for user-initiated cancellations
- Only admin-initiated deletion removes data
- Resubscription restores complete access to all preserved data

---

## Edge Cases

### User cancels mid-billing-cycle
- Stripe sets `cancel_at_period_end = true` when user cancels
- Subscription stays active until `current_period_end`
- Webhook `customer.subscription.deleted` fires at `period_end`
- We honor the full paid period — no early access revocation

### Payment fails multiple times
- Stripe retries automatically (typically 3 attempts over ~2 weeks)
- Each failure triggers `invoice.payment_failed` webhook
- Attempts 1-2: "update payment method" email
- Attempt 3+: "final warning" email
- If all retries fail, Stripe fires `customer.subscription.deleted`
- Normal cancellation flow begins at that point

### Resubscribe after cancellation
- User clicks resubscribe → Stripe checkout with their previous tier pre-selected
- `checkout.session.completed` webhook fires
- Clear: `subscription_cancelled_at`, `subscription_period_end`, `cancelled_tier`
- Set: `account_type='paid'`, `tier=new_tier`
- All data instantly accessible again

### Multi-user accounts (staff vs owner)
- Only the owner sees billing/subscription UI
- Staff on a cancelled_grace account: see amber banner with "Contact your account owner"
- Staff on a cancelled_limited account: see persistent banner "Your account's subscription has ended. Contact your account owner."
- Staff cannot resubscribe — only owner can

### Missing stripe_customer_id on webhook
- If `stripe_customer_id` lookup returns no account: log warning, return 200
- Do NOT retry or error — the customer may have been deleted or created outside ConsignIQ

### Admin override vs user-initiated
- **Admin cancellation** (via `/api/admin/accounts/delete`): immediate, bypasses grace period for comp/trial, soft deletes paid
- **User cancellation** (via Stripe portal): triggers webhook flow with grace period
- Both share the same final account states but different paths
- Admin can always override any state via the account detail page

---

## Email Triggers

| Email | Trigger | Recipient | Template |
|---|---|---|---|
| Cancellation confirmation | `subscription.deleted` webhook | Owner | `buildCancellationEmail()` (existing) |
| Grace period reminder | Cron: 3 days before `subscription_period_end` | Owner | New: `buildGraceReminderEmail()` |
| Access ended | Server-side: `period_end` reached, transition to `cancelled_limited` | Owner | New: `buildAccessEndedEmail()` |
| Payment failed (warning) | `invoice.payment_failed`, attempt 1-2 | Owner | `buildPaymentFailedEmail()` (existing) |
| Payment failed (final) | `invoice.payment_failed`, attempt 3+ | Owner | New: `buildPaymentFinalWarningEmail()` |
| Welcome back | `checkout.session.completed` on resubscribe | Owner | New: `buildWelcomeBackEmail()` |
| Account suspended | Admin suspends account | Owner | New: `buildSuspensionEmail()` |
| Account closed | Admin deletes account | Owner | `buildAccountDeletedEmail()` (existing) |
| Upgrade confirmation | `checkout.session.completed` on new sub | Owner | `buildUpgradeEmail()` (existing) |

---

## UI Behavior by State

### cancelled_grace
- **Banner**: Amber, full-width below header. "Your subscription has been cancelled. You have access until [date]. [Resubscribe button]"
- **Features**: Full tier access (same as active)
- **Settings billing tab**: Shows "Cancelled" badge, resubscribe button, date access ends
- **Staff view**: Banner says "Contact your account owner about the subscription"

### cancelled_limited
- **Banner**: Persistent orange/red, full-width. "Your [tier] plan ended on [date]. Your data is safe. [Resubscribe button]"
- **Features**: Solo tier only (Dashboard, Price Lookup, Inventory, Settings)
- **Blocked pages**: Show "Your subscription has ended" message with resubscribe CTA instead of tier upgrade prompt
- **Settings billing tab**: Shows previous tier, resubscribe button, "Your data is preserved"
- **Staff view**: "Your account's subscription has ended. Contact your account owner."

### suspended
- **Full-screen**: Suspension page replacing all dashboard content
- **Message**: "Your account has been suspended. Contact support for assistance."
- **No feature access**: No sidebar, no navigation

### deleted (soft)
- **Full-screen**: Account closed page
- **Message**: "Your account has been closed. Contact support if you believe this is an error."
- **No login possible**: Auth sessions revoked

---

## Relationship to Existing Features

### Implemented
- Admin deletion: `/api/admin/accounts/delete` — hard delete for comp/trial, soft delete for paid
- Stripe webhook: `/api/billing/webhook` — handles `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`
- Cancellation email: `buildCancellationEmail()` in email-templates.ts
- Payment failed email: `buildPaymentFailedEmail()` in email-templates.ts
- Upgrade email: `buildUpgradeEmail()` in email-templates.ts
- Account deleted email: `buildAccountDeletedEmail()` in email-templates.ts
- Trial expired page: `TrialExpiredPage` component
- Trial banner: `TrialBanner` component
- Database migration: `20260315020000` adds `subscription_cancelled_at`, `subscription_period_end`, `cancelled_tier`
- Webhook handler: `subscription.deleted` sets `cancelled_grace`, `checkout.session.completed` handles resubscription (clears cancellation fields)
- Webhook handler: `subscription.updated` detects resubscribe via Stripe portal (cancelled_grace/limited → paid + welcome back email)
- Grace period cron: `/api/billing/check-grace-periods` — sends reminders 3 days before `period_end`, auto-transitions overdue `cancelled_grace` → `cancelled_limited`
- Email templates: `buildGraceReminderEmail()`, `buildAccessEndedEmail()`, `buildPaymentFinalWarningEmail()`, `buildWelcomeBackEmail()`
- Feature gating: `cancelled_grace` and `cancelled_limited` in `AccountType` type, handled by `feature-gates.ts`
- Tier rename backward-compat mapping removed 2026-03-17 (no in-flight sessions with old names remain)

### Deferred
- Suspension page component
- Staff-specific messaging for cancelled accounts

---

## Implementation Notes

### Database Changes Required
```sql
ALTER TABLE accounts ADD COLUMN subscription_period_end timestamptz;
ALTER TABLE accounts ADD COLUMN subscription_cancelled_at timestamptz;
ALTER TABLE accounts ADD COLUMN cancelled_tier text;
```

### account_type Values (expanded)
Current: `paid`, `trial`, `complimentary`
Add: `cancelled_grace`, `cancelled_limited`

### Key Functions Modified
- `isAccountActive()` in `feature-gates.ts` — handles `cancelled_grace` (active) and `cancelled_limited` (limited)
- `getEffectiveTier()` in `feature-gates.ts` — returns `cancelled_tier` for grace, `'solo'` for limited
- Webhook handler (`/api/billing/webhook`) — `subscription.deleted` sets `cancelled_grace`, `checkout.session.completed` handles resubscribe, `subscription.updated` handles portal resubscribe
- Cron (`/api/billing/check-grace-periods`) — auto-transitions overdue `cancelled_grace` → `cancelled_limited`

### Auto-Transition Logic (Cron)
Handled by `/api/billing/check-grace-periods` (CRON_SECRET auth):
1. Finds all `cancelled_grace` accounts where `subscription_period_end < now`
2. Updates each to `account_type = 'cancelled_limited'`
3. Sends "access ended" email (non-critical)
4. Also sends grace reminders 3 days before `period_end` for accounts still in `cancelled_grace`
