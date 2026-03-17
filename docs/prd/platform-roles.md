# Platform Roles — PRD

**Status:** Implemented

## Overview

Platform roles separate platform management access from customer tier features. Customer accounts have tiers (solo/shop/enterprise) that control product features. Platform users have `platform_role` values that control admin panel access.

## Platform Roles

| Role | Access | Purpose |
|---|---|---|
| `super_admin` | Full admin panel + role management | Platform owners, can assign/remove all roles |
| `support` | Full admin panel (read/write) | Customer support staff |
| `finance` | Full admin panel (read/write) | Billing and financial operations |
| `null` | No admin access | Regular customer users |

All three roles grant access to `/admin` routes via `checkSuperadmin()`. Only `super_admin` can modify platform roles on other users.

## Database Schema

### `users.platform_role`
- Type: `text`, nullable, default `NULL`
- CHECK constraint: `IN ('super_admin', 'support', 'finance')`
- Partial index: `idx_users_platform_role WHERE platform_role IS NOT NULL`
- `NULL` = regular customer user

### `accounts.is_system`
- Type: `boolean`, NOT NULL, default `false`
- Marks internal/system accounts (e.g., "ConsignIQ System")
- Used to filter system accounts from admin stats and account lists

### Legacy: `users.is_superadmin`
- Retained for rollback safety — still read as fallback in all access-control paths (dual-read pattern with `platform_role`)
- Migration populated `platform_role = 'super_admin'` for all `is_superadmin = true` users

## Access Control

### `checkSuperadmin()` (`src/lib/supabase/admin.ts`)
- Reads both `platform_role` and `is_superadmin` (dual-read for backward compatibility)
- Returns `{ authorized: true, userId, platformRole }` on success
- Returns `{ authorized: false, status: 401|403 }` on failure
- All admin API routes check `auth.authorized` — backward compatible

### `/api/auth/check-superadmin`
- Returns `{ is_superadmin: boolean, platform_role: string|null }`
- `is_superadmin` derived from `!!platform_role || is_superadmin === true` (dual-read for backward compatibility with login flow)

### Layout Gates
- `/admin/layout.tsx`: redirects to `/dashboard` if no `platform_role` and no `is_superadmin` (dual-read fallback)
- `/dashboard/layout.tsx`: redirects to `/admin` if `platform_role` is set or `is_superadmin` is true (dual-read fallback)

## Role Management

### API: `PATCH /api/admin/users`
- Body: `{ user_id, platform_role }` (role string or `null` to remove)
- Only `super_admin` callers can modify roles (403 for support/finance)
- Validates role value against allowed list
- Blocks removing the last `super_admin`

### UI: Admin Users Page
- "Platform Role" column visible to `super_admin` and `support` users (color-coded badges: red/blue/amber)
- Tier and Type columns show `—` for platform user rows (these fields are only meaningful for customer users)
- Click badge or "Set role" link to edit via inline dropdown (`super_admin` only)
- "Add User" button with customer/platform toggle (`super_admin` only)
- Last super_admin protection (API-side)

## Stats Filtering

Admin stats (`/api/admin/stats`) filter system accounts via `.eq('is_system', false)` instead of the legacy `.neq('name', 'ConsignIQ System')` pattern.

Admin accounts list (`/api/admin/accounts`) filters system accounts by default. Pass `?show_system=true` to include them.

## How to Add a New Platform User

1. **Existing user:** PATCH `/api/admin/users` with `{ user_id, platform_role: 'super_admin'|'support'|'finance' }`
2. **New user:** POST `/api/admin/users` with `{ email, full_name, platform_role }` — creates auth user + users row on system account in one step (super_admin only). Auto-creates a "System" location for the system account if none exists.
3. **Direct DB:** `UPDATE users SET platform_role = 'super_admin' WHERE email = '...'`

Platform user invite emails use `buildInviteEmail()` with `isPlatformUser: true`, which omits the Plan line and uses `accountName: 'ConsignIQ'`.

## Migration

Migration: `20260316020000_platform_roles.sql`
- Adds `users.platform_role` with CHECK constraint
- Adds `accounts.is_system` boolean
- Migrates `is_superadmin = true` → `platform_role = 'super_admin'`
- Migrates `name = 'ConsignIQ System'` → `is_system = true`
- Creates partial index on `platform_role`
