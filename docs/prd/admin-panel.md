# Admin Panel — PRD

**Status:** Implemented

## Access Control

- Gated by `users.platform_role` (super_admin/support/finance). See `/docs/prd/platform-roles.md`
- Admin layout checks via service role client (bypasses RLS)
- All admin API routes use `checkSuperadmin()` → 403 for users without a `platform_role`
- Only `super_admin` can modify platform roles on other users
- All admin queries are cross-account (no `account_id` scoping)
- Login redirect: platform role users go to `/admin`, never `/dashboard`
- `/api/auth/check-superadmin` returns `{ is_superadmin, platform_role }` — `is_superadmin` derived from `!!platform_role`, used by login flow for redirect

## Admin Dashboard (`/admin`)

Stats from two endpoints: `/api/admin/stats` (counts) + `/api/admin/network-stats` (pricing intel).

**Stat cards:** Accounts total, Locations total, Users total, Items total, Consignors total

**Breakdowns:**
- Accounts by tier: Solo, Shop, Enterprise
- Accounts by status: Active, Suspended, Cancelled
- Items by status: Pending, Priced, Sold, Donated
- Consignors by status: Active, Expired, Grace, Closed

**Network Pricing Intelligence:** Total price_history records, sold items count, top 5 categories by record count, avg days to sell.

**Implementation:** All counts use `{ count: 'exact', head: true }` — no data transfer, 19 parallel queries. Account queries filter system accounts via `.eq('is_system', false)`.

## Account Management

**List (`/admin/accounts`):** Filterable by tier and status. Shows name, tier badge, status badge, location count, user count, created date. System account rows (`is_system = true`) show `—` for Tier instead of a badge. Click row → detail page.

**Detail (`/admin/accounts/[id]`):** Account info card, tier/status dropdowns with save buttons, action buttons, item counts grid, locations list, users list with reset password per user.

**Actions:** Extend Trial (+30d), Convert to Complimentary, Convert to Paid, Disable/Enable, Suspend, Delete Account.

**Delete:** See `/docs/prd/account-deletion.md`.

## User Management (`/admin/users`)

**List:** Search by email/name, filter by account type and tier. Table shows email, name, account, tier badge, account type badge, platform role badge (conditionally). Platform user rows show `—` for Tier and Type columns (these fields are only meaningful for customer users). Fetches current user's `platform_role` via `/api/auth/check-superadmin` on mount to determine UI visibility.

**Platform Role Management:** Super admins can click a role badge or "Set role" link to assign/remove platform roles (super_admin/support/finance) via inline dropdown. Includes last-super-admin protection — cannot remove `super_admin` role if only one remains. Cancel button to dismiss without saving.

**Role-based visibility:**
- Platform Role column: visible to `super_admin` and `support` roles
- Add User button: visible to `super_admin` only
- Set/edit platform role: `super_admin` only (inline dropdown on click)
- Non-super_admin support/finance users see platform role badges but cannot edit them

**Add User modal (super_admin only):**
- User type selector (radio): Customer User or Platform User
- **Customer User fields:** Email, Full Name, Account Name, Tier (solo/shop/enterprise), Account Type (paid/trial/complimentary)
  - Creates: account row → location row → auth user → users table row (upsert) → recovery link → invite email via Resend
  - Rejects account names that match existing system accounts (case-insensitive) to prevent duplicates
- **Platform User fields:** Email, Full Name, Platform Role (super_admin/support/finance)
  - Creates: auth user → users table row (upsert on system account/location) → recovery link → platform invite email via Resend
  - Uses system account (`is_system=true`) and its location — does not create new account/location. Auto-creates system location if none exists
  - Only `super_admin` can create platform users (server-enforced)
- Invite email is non-critical — returns `invite_warning` if it fails
- Recovery link type (not invite) for 24-hour expiry

**Reset Password:** Per-user button on account detail page. Generates recovery link, sends branded reset email.

**Delete User:** Per-user "Remove" button on account detail page. Confirmation dialog, deletes users table row + Supabase auth user. Cannot delete last super_admin. API: DELETE `/api/admin/users/[userId]` (superadmin only, UUID validated).

**Shared UI:** Uses `Modal` component (`src/components/ui/Modal.tsx`) for Add User form — escape-to-close, backdrop click, scroll lock. Uses `ConfirmModal` (`src/components/ui/ConfirmModal.tsx`) for destructive confirmations (remove user, delete item) — replaces native `confirm()` dialogs with styled modals. Style constants from `src/lib/style-constants.ts` (`TIER_BADGE_CLASSES`, `MODAL_BACKDROP`, `MODAL_CONTAINER`).

## Network Stats (`/api/admin/network-stats`)

Cross-account pricing intelligence from `price_history` table:
- Total records count (head:true query)
- Sold records with `sold_price` and `days_to_sell` (filtered by `sold=true` in DB)
- Top 5 categories by count
- Average days to sell

## Admin vs Customer Separation

- Separate layout with dark navy sidebar (`bg-navy-900`), Logo component + "Admin" badge
- Active nav: `border-l-2 border-brand-500 text-brand-400 bg-white/5`; inactive: `text-white/65`
- Primary action buttons use `bg-brand-600` (teal), not red
- Disable/suspend buttons use amber; delete stays red
- No "Back to App" link — platform users live in `/admin` only
- Sign Out button at sidebar bottom (stone-400 text)
- Superadmin accessing `/dashboard` is redirected to `/admin`
- Mobile: fixed top header bar with hamburger menu → slide-out overlay sidebar (same nav content)

## Stats Filtering

- `/api/admin/stats` excludes system accounts from all account counts via `.eq('is_system', false)`
- `/api/admin/accounts` excludes system accounts by default; pass `?show_system=true` to include
- Item, consignor, location, and user counts are unfiltered

## Sidebar User Identity Pattern

Both dashboard and admin sidebars follow the same pattern at the bottom:
- **Line 1:** Display name (bold, `text-sm font-medium`)
- **Line 2:** Email address (muted, `text-xs`, truncated)
- Falls back to email if `full_name` is empty
- Admin sidebar: Overview, Users, Accounts (dark navy theme with Logo component)
