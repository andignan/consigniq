# Sidebar & Navigation Test Plan

## Scope
Responsive sidebar component, navigation items, active state highlighting, mobile hamburger menu, sign out, user info display.

## Happy Path
1. Log in and navigate to `/dashboard`
2. Verify sidebar is visible on desktop (md+ breakpoint)
3. Verify 7 nav items: Dashboard, Consignors, Inventory, Price Lookup, Pending Items, Reports, Settings
4. Verify "Dashboard" nav item is highlighted (amber background) on `/dashboard`
5. Click "Consignors" — verify navigation and active state moves to Consignors
6. Click "Inventory" — verify navigation and active state
7. Verify user name/email displays in bottom section
8. Verify user role displays (capitalized) below name
9. Verify location name displays below "ConsignIQ" branding
10. Click "Sign out" — verify redirect to `/auth/login`

## Active State Logic
- [ ] `/dashboard` — only Dashboard is active (exact match)
- [ ] `/dashboard/consignors` — Consignors is active
- [ ] `/dashboard/consignors/[id]` — Consignors is active (prefix match)
- [ ] `/dashboard/consignors/new` — Consignors is active (prefix match)
- [ ] `/dashboard/consignors/[id]/intake` — Consignors is active (prefix match)
- [ ] `/dashboard/inventory` — Inventory is active
- [ ] `/dashboard/inventory?status=pending` — Pending Items is active (exact query match), NOT Inventory
- [ ] `/dashboard/inventory?status=sold` — Inventory is active (no exact query match for sold)
- [ ] `/dashboard/pricing` — Price Lookup is active
- [ ] `/dashboard/reports` — Reports is active
- [ ] `/dashboard/settings` — Settings is active

## Mobile Behavior
- [ ] Sidebar is hidden on mobile (below md breakpoint)
- [ ] Fixed header bar shows at top with hamburger icon and "ConsignIQ" text
- [ ] Tapping hamburger opens sidebar as overlay with dark backdrop
- [ ] Tapping backdrop closes sidebar
- [ ] Navigating to a new page auto-closes the mobile sidebar
- [ ] Sidebar overlay is full-height with same content as desktop sidebar
- [ ] Mobile sidebar width is `w-60` (consistent with desktop)
- [ ] Main content has `pt-14` offset on mobile for the fixed header bar

## Edge Cases
- [ ] User with no `full_name` shows email instead
- [ ] User with no `locations` — location name line is not rendered
- [ ] Very long location name is truncated (CSS `truncate`)
- [ ] Very long user name is truncated (CSS `truncate`)
- [ ] Sign out clears session and calls `router.refresh()`
- [ ] Navigating rapidly between pages doesn't break active state
- [ ] Browser back/forward updates active state correctly

## Role Enforcement
- [ ] Both owner and staff see all 7 nav items (settings visibility is handled on the settings page itself, not in sidebar)
- [ ] Role badge shows "owner" or "staff" correctly

## Current Status
- **Automated**: None (client component — would require component or E2E tests)
- **Manual**: Full walkthrough on both desktop and mobile viewports required
