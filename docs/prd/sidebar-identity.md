# Sidebar Identity System

## Overview

Config-driven identity display for all sidebar variants (customer dashboard, admin panel). Single source of truth in `src/lib/sidebar-identity.ts`.

## Badge Configuration

Eight badge keys covering all user types:

| Key | Label | Color | Context |
|---|---|---|---|
| `super_admin` | Super Admin | Red | Admin sidebar |
| `support` | Support | Blue | Admin sidebar |
| `finance` | Finance | Amber | Admin sidebar |
| `solo` | Solo | Purple | Customer sidebar |
| `shop` | Owner | Green (brand) | Customer sidebar |
| `shop_staff` | Staff | Slate | Customer sidebar |
| `enterprise` | Owner | Green (brand) | Customer sidebar |
| `enterprise_staff` | Staff | Slate | Customer sidebar |

## Resolution Order

`getBadgeConfig(tier, role, platformRole)`:

1. **Platform role** (if provided and valid) — takes precedence
2. **Tier + role** — solo ignores role; shop/enterprise check for staff vs owner

## Display Layout

### Customer Sidebar (upper section)
- Logo
- Business name (`accounts.name`) for Shop/Enterprise only
- Solo shows nothing below logo

### Customer Sidebar (bottom section)
- First name (via `getDisplayName`)
- Email
- Role badge pill

### Admin Sidebar (upper section)
- Logo only (no hardcoded "Admin" badge)

### Admin Sidebar (bottom section)
- First name (via `getDisplayName`)
- Email
- Platform role badge pill

## Adding New Tiers/Roles

1. Add entry to `SIDEBAR_BADGES` in `src/lib/sidebar-identity.ts`
2. Add color to `BADGE_COLOR_CLASSES` if new color needed
3. Add test case to `__tests__/unit/sidebar-identity.test.ts`
4. Update this document

## Key Files

- `src/lib/sidebar-identity.ts` — badge config, `getBadgeConfig()`, `getDisplayName()`
- `src/components/layout/Sidebar.tsx` — customer dashboard sidebar
- `src/app/admin/AdminSidebar.tsx` — admin panel sidebar
- `__tests__/unit/sidebar-identity.test.ts` — 21 tests
