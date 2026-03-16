# Admin Panel — PRD

**Status:** Implemented

## Access Control

- Gated by `is_superadmin` boolean on `users` table
- Admin layout checks via service role client (bypasses RLS)
- All admin API routes use `checkSuperadmin()` → 403 for non-superadmins
- All admin queries are cross-account (no `account_id` scoping)
- Login redirect: superadmin users go to `/admin`, never `/dashboard`

## Admin Dashboard (`/admin`)

Stats from two endpoints: `/api/admin/stats` (counts) + `/api/admin/network-stats` (pricing intel).

**Stat cards:** Accounts total, Locations total, Users total, Items total, Consignors total

**Breakdowns:**
- Accounts by tier: Solo, Starter, Standard, Pro
- Accounts by status: Active, Suspended, Cancelled
- Items by status: Pending, Priced, Sold, Donated
- Consignors by status: Active, Expired, Grace, Closed

**Network Pricing Intelligence:** Total price_history records, sold items count, top 5 categories by record count, avg days to sell.

**Implementation:** All counts use `{ count: 'exact', head: true }` — no data transfer, 19 parallel queries.

## Account Management

**List (`/admin/accounts`):** Filterable by tier and status. Shows name, tier badge, status badge, location count, user count, created date. Click row → detail page.

**Detail (`/admin/accounts/[id]`):** Account info card, tier/status dropdowns with save buttons, action buttons, item counts grid, locations list, users list with reset password per user.

**Actions:** Extend Trial (+30d), Convert to Complimentary, Convert to Paid, Disable/Enable, Suspend, Delete Account.

**Delete:** See `/docs/prd/account-deletion.md`.

## User Management (`/admin/users`)

**List:** Search by email/name, filter by account type and tier. Table shows email, name, account, tier badge, account type badge.

**Add User modal:**
- Fields: Email, Full Name, Account Name, Tier (solo/starter/standard/pro), Account Type (paid/trial/complimentary)
- Creates: account row → location row → auth user → users table row (upsert) → recovery link → invite email via Resend
- Invite email is non-critical — returns `invite_warning` if it fails
- Recovery link type (not invite) for 24-hour expiry

**Reset Password:** Per-user button on account detail page. Generates recovery link, sends branded reset email.

## Network Stats (`/api/admin/network-stats`)

Cross-account pricing intelligence from `price_history` table:
- Total records count (head:true query)
- Sold records with `sold_price` and `days_to_sell` (filtered by `sold=true` in DB)
- Top 5 categories by count
- Average days to sell

## Admin vs Customer Separation

- Separate layout with red/Shield branding sidebar
- No "Back to App" link — superadmins live in `/admin` only
- Sign Out button at sidebar bottom
- Superadmin accessing `/dashboard` is redirected to `/admin`

## Sidebar User Identity Pattern

Both dashboard and admin sidebars follow the same pattern at the bottom:
- **Line 1:** Display name (bold, `text-sm font-medium`)
- **Line 2:** Email address (muted, `text-xs`, truncated)
- Falls back to email if `full_name` is empty
- Admin sidebar: Overview, Users, Accounts
