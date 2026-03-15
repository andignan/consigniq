# Account Deletion & Suspension — Product Requirements Document

**Status:** Implemented
**Date:** 2026-03-15
**Scope:** Hard delete, soft delete, suspension, admin UI, email notifications

---

## Deletion Types

### Hard Delete (Complimentary / Trial Accounts)

Immediately and permanently deletes all account data. Irreversible.

**Deletion order** (respects foreign key constraints):
1. `markdowns` WHERE `account_id` = target
2. `price_history` WHERE `account_id` = target
3. `agreements` WHERE `account_id` = target
4. `items` WHERE `account_id` = target
5. `invitations` WHERE `account_id` = target
6. `consignors` WHERE `account_id` = target
7. `users` table rows WHERE `account_id` = target
8. `locations` WHERE `account_id` = target
9. `accounts` row WHERE `id` = target
10. Supabase auth users via `supabase.auth.admin.deleteUser(userId)` for each user

**After deletion:**
- Send account closed email to owner (best-effort, non-critical)
- Admin redirected to `/admin/accounts` list

**Applies to:** `account_type = 'complimentary'`, `account_type = 'trial'`, or paid accounts without `stripe_customer_id`

### Soft Delete (Paid Accounts with Stripe)

Preserves all data for 30 days. Recoverable by admin within that window.

**Steps:**
1. Cancel all active Stripe subscriptions via `stripe.subscriptions.cancel(sub.id)`
2. Set `accounts.status = 'deleted'`
3. Set `accounts.deleted_at = now()`
4. Set `accounts.deletion_reason = reason` (if provided)
5. Send account closed email to owner

**Data preserved:** All items, consignors, price_history, agreements, locations, users, markdowns remain in the database. User auth accounts remain but dashboard layout blocks access (status = 'deleted' renders lockout page).

**What is NOT deleted from Stripe:**
- Customer record (`stripe_customer_id`) — never delete from Stripe
- Payment history / invoices — preserved for accounting and compliance
- Only subscriptions are cancelled

---

## Suspension

Reversible admin action. Blocks all user access while preserving all data.

**Steps:**
1. Set `accounts.status = 'suspended'`
2. Dashboard layout detects `status = 'suspended'` and renders lockout page
3. All user sessions are implicitly revoked (layout check runs on every page load)

**User experience:**
- Next dashboard load shows full-screen suspension page
- Message: "Your account has been suspended. Contact support for assistance."
- No sidebar, no navigation, no feature access

**Reversal:**
- Admin sets `status = 'active'` via account detail page
- User regains full access on next page load
- No email sent on unsuspend (admin can manually notify)

**Email:** Suspension email sent to account owner when suspended.

---

## Confirmation Requirement

### Delete Account Modal
- **Trigger:** Red "Delete Account" button on `/admin/accounts/[id]`
- **Name confirmation:** Admin must type the account name to enable the delete button
- **Matching:** Case-insensitive (`trim().toLowerCase()` comparison)
- **Reason field:** Optional text input for audit trail (stored in `accounts.deletion_reason`)
- **Context-aware description:** Modal shows different text based on account type:
  - Complimentary/Trial: "This will permanently delete all data immediately."
  - Paid with Stripe: "This will cancel their Stripe subscription and schedule data deletion in 30 days."
  - Paid without Stripe: "This will schedule data deletion in 30 days."

### Suspend Account Modal
- **Trigger:** Orange "Suspend Account" button (only shown for active accounts)
- **Confirmation:** Simple confirmation dialog, no name typing required
- **Message:** "Suspend [Account Name]? Users will lose access immediately but all data is preserved."

---

## Email Notifications

| Action | Email | Recipient | Template |
|---|---|---|---|
| Hard delete | Account closed | Owner | `buildAccountDeletedEmail({ isPaid: false })` |
| Soft delete | Subscription cancelled + scheduled deletion | Owner | `buildAccountDeletedEmail({ isPaid: true })` |
| Suspension | Account suspended | Owner | Inline in admin action (future: `buildSuspensionEmail()`) |

All emails use the ConsignIQ branded header template (logo + "AI-Powered Consignment Management" tagline).

---

## Admin UI

### Account Detail Page (`/admin/accounts/[id]`)

**Action buttons (in Actions section):**
| Button | Color | Condition | Action |
|---|---|---|---|
| Extend Trial (+30d) | Blue | `account_type = 'trial'` | Adds 30 days to `trial_ends_at` |
| Convert to Complimentary | Purple | `account_type != 'complimentary'` | Sets complimentary + tier |
| Convert to Paid | Green | `account_type != 'paid'` | Sets `account_type = 'paid'` |
| Disable/Enable Account | Red/Green | Always | Toggles `status` between `active` and `inactive` |
| Suspend Account | Orange | `status = 'active'` | Sets `status = 'suspended'` with modal |
| Delete Account | Red | Always | Opens name-confirmation modal |

### Account List Page (`/admin/accounts`)

**Status badges:**
- Active: green badge
- Suspended: amber badge
- Cancelled: gray badge
- Deleted: red badge
- Inactive: gray badge

---

## API

### POST `/api/admin/accounts/delete`

**Auth:** Superadmin only (via `checkSuperadmin()`)

**Request body:**
```json
{
  "account_id": "uuid",
  "reason": "optional string"
}
```

**Response (hard delete):**
```json
{
  "deleted": true,
  "soft_deleted": false,
  "message": "Account and all data permanently deleted"
}
```

**Response (soft delete):**
```json
{
  "deleted": false,
  "soft_deleted": true,
  "message": "Stripe subscription cancelled and account marked for deletion"
}
```

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Account with no `stripe_customer_id` | Skip Stripe cancellation, proceed to soft delete (sets status='deleted') |
| Account with already-cancelled subscription | Skip Stripe cancellation (no active subs to cancel), proceed to soft delete |
| Account with multiple users | Delete all auth users on hard delete, send email to owner only |
| Admin accidentally deletes paid account | 30-day recovery window — admin can manually restore by setting `status = 'active'` and clearing `deleted_at` |
| Admin accidentally deletes comp/trial account | No recovery — hard delete is permanent and immediate |
| Account in `cancelled_grace` or `cancelled_limited` state | Treated as paid for deletion purposes if `stripe_customer_id` exists |
| Supabase auth user deletion fails for one user | Continue deleting remaining users — logged but non-blocking |

---

## Database Fields

| Column | Type | Purpose |
|---|---|---|
| `accounts.status` | text | 'active', 'suspended', 'cancelled', 'inactive', 'deleted' |
| `accounts.deleted_at` | timestamptz | When soft delete occurred |
| `accounts.deletion_reason` | text | Admin-provided reason for deletion |

---

## Future: Hard Delete Cron Job (Not Yet Built)

A cron endpoint to permanently delete data for soft-deleted accounts after 30 days.

**Endpoint:** `/api/admin/cleanup-deleted-accounts` (planned)

**Logic:**
1. Find accounts where `status = 'deleted'` AND `deleted_at < now() - 30 days`
2. For each: run the same hard delete sequence as complimentary/trial accounts
3. Delete Supabase auth users
4. No email notification (already sent at soft delete time)
5. Auth: CRON_SECRET pattern

**Not yet implemented.** Document here as planned so future sessions know the intent.
