# Platform Roles — PRD

**Status:** Implemented

## Overview

Platform roles separate platform management access from customer tier features. Customer accounts have tiers (solo/starter/standard/pro) that control product features. Platform users have `platform_role` values that control admin panel access.

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
- Retained for rollback safety — not read by application code
- Migration populated `platform_role = 'super_admin'` for all `is_superadmin = true` users

## Access Control

### `checkSuperadmin()` (`src/lib/supabase/admin.ts`)
- Reads `platform_role` (not `is_superadmin`)
- Returns `{ authorized: true, userId, platformRole }` on success
- Returns `{ authorized: false, status: 401|403 }` on failure
- All admin API routes check `auth.authorized` — backward compatible

### `/api/auth/check-superadmin`
- Returns `{ is_superadmin: boolean, platform_role: string|null }`
- `is_superadmin` derived from `!!platform_role` for backward compatibility with login flow

### Layout Gates
- `/admin/layout.tsx`: redirects to `/dashboard` if no `platform_role`
- `/dashboard/layout.tsx`: redirects to `/admin` if `platform_role` is set

## Role Management

### API: `PATCH /api/admin/users`
- Body: `{ user_id, platform_role }` (role string or `null` to remove)
- Only `super_admin` callers can modify roles (403 for support/finance)
- Validates role value against allowed list
- Blocks removing the last `super_admin`

### UI: Admin Users Page
- "Platform Role" column with color-coded badges
- Click badge or "Set role" link to edit (dropdown)
- Role editing only visible to `super_admin` users
- Last super_admin protection (API-side)

## Stats Filtering

Admin stats (`/api/admin/stats`) filter system accounts via `.eq('is_system', false)` instead of the legacy `.neq('name', 'ConsignIQ System')` pattern.

Admin accounts list (`/api/admin/accounts`) filters system accounts by default. Pass `?show_system=true` to include them.

## How to Add a New Platform User

1. **Existing user:** PATCH `/api/admin/users` with `{ user_id, platform_role: 'super_admin'|'support'|'finance' }`
2. **New user:** Create via admin panel (POST `/api/admin/users`), then set platform role via PATCH
3. **Direct DB:** `UPDATE users SET platform_role = 'super_admin' WHERE email = '...'`

## Migration

Migration: `20260316020000_platform_roles.sql`
- Adds `users.platform_role` with CHECK constraint
- Adds `accounts.is_system` boolean
- Migrates `is_superadmin = true` → `platform_role = 'super_admin'`
- Migrates `name = 'ConsignIQ System'` → `is_system = true`
- Creates partial index on `platform_role`
