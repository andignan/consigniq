# Dashboard Home Page Test Plan

## Scope
Dashboard home page (`/dashboard`) — stats cards, lifecycle alerts, quick actions, server-side data loading.

## Happy Path
1. Navigate to `/dashboard`
2. Verify page title shows "Dashboard" with today's date
3. Verify "New Consignor" button links to `/dashboard/consignors/new`
4. Verify 4 stat cards display: Active Consignors, Needs Pricing, Inventory Value, Sold This Period
5. Verify Active Consignors card shows count and "X expiring soon" sub-text
6. Verify Needs Pricing shows pending item count and "X priced, on floor" sub-text
7. Verify Inventory Value shows dollar total of priced items
8. Verify Sold This Period shows count of sold items
9. Verify each stat card links to the correct page (consignors, inventory?status=pending, inventory, inventory?status=sold)
10. Verify Quick Actions section shows: Add New Consignor, Price Pending Items (with count), View All Consignors

## Lifecycle Alerts
- [ ] Alert banner shows when consignors are expiring within 7 days (orange)
- [ ] Alert banner shows when consignors are in grace period (red, with AlertTriangle icon)
- [ ] Alert banner shows when consignors are past grace / donation eligible (gray)
- [ ] Alert banners link to filtered consignor list (`?filter=expiring`, `?filter=grace`, `?filter=donation`)
- [ ] No alert section renders when no consignors are expiring, in grace, or donation eligible
- [ ] Alert counts use correct singular/plural ("1 consignor" vs "2 consignors")
- [ ] Alerts appear in order: donation eligible, grace period, expiring soon

## Edge Cases
- [ ] Dashboard with 0 consignors shows 0 in all stat cards and no alerts
- [ ] Dashboard with 0 items shows $0 inventory value and 0 pending/sold
- [ ] Inventory value formatting — large numbers show commas (e.g., $12,345)
- [ ] Inventory value shows no decimal places
- [ ] `location_id` falls back to `DEFAULT_LOCATION_ID` env var if not in query params
- [ ] Items with null price are excluded from inventory value calculation
- [ ] Quick action "Price Pending Items" is highlighted (amber) when pendingItems > 0
- [ ] Quick action "Price Pending Items" is not highlighted when pendingItems === 0

## Role Enforcement
- [ ] Both owner and staff see the same dashboard (no role-specific sections)
- [ ] Data is scoped to the user's location_id — staff sees only their location's data

## Mobile
- [ ] Stat cards render in 2-column grid on mobile
- [ ] Alert banners stack vertically and are tappable
- [ ] Quick actions section is full-width
- [ ] Page has correct padding offset for mobile header (`pt-14 md:pt-0` on layout)

## Current Status
- **Automated**: None (server component — would require integration/E2E tests)
- **Manual**: Full walkthrough required with test data in various lifecycle states
