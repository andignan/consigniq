# Cross-Customer Pricing Intelligence Test Plan

## Scope
Anonymized cross-account pricing aggregation for Pro-tier users, market intelligence panel on pricing screen, admin network stats dashboard.

## API: /api/pricing/cross-account

### Happy Path
1. Log in as Pro-tier owner
2. Navigate to inventory → price an item
3. Verify Market Intelligence panel loads below "Priced Before"
4. Verify panel shows: match level badge, sample count, avg price, median, range, avg days
5. If Claude API configured, verify insight text appears

### Three-Level Matching
- [ ] Exact match: same name + category + condition, ≥3 samples → shows "Exact match"
- [ ] Fuzzy match: ilike name + category (any condition), ≥3 samples → shows "Similar items"
- [ ] Category fallback: all sold in category, ≥3 samples → shows "Category average"
- [ ] Insufficient data: <3 samples at all levels → panel hidden

### Edge Cases
- [ ] Unauthenticated → 401
- [ ] Starter tier → 403
- [ ] Standard tier → 403
- [ ] Pro tier → 200 with stats
- [ ] Missing category param → 400
- [ ] No data in network → returns null stats, panel hidden
- [ ] Stats computed without account_id filter (truly cross-account)
- [ ] Claude insight generation failure → stats returned without insight_text

## UI: Market Intelligence Panel

### Pro Tier
- [ ] Panel appears after "Priced Before" section on pricing page
- [ ] Globe icon with blue theme
- [ ] Match level badge (exact/similar/category) + sample count
- [ ] Insight text when available
- [ ] Stats grid: avg price, median, range, avg days to sell
- [ ] Panel hidden when no data (< 3 samples)

### Non-Pro Tier
- [ ] UpgradePrompt shown instead of panel
- [ ] Shows "Cross-Customer Pricing Intelligence" feature name
- [ ] Links to /dashboard/settings?tab=account#billing

## Admin: Network Stats

### Happy Path
1. Log in as superadmin
2. Navigate to /admin
3. Verify Network Pricing Intelligence card appears below existing cards
4. Verify shows: total records, sold items, sell-through %, avg days to sell
5. Verify top 5 categories listed with counts

### Edge Cases
- [ ] Non-superadmin cannot access /api/admin/network-stats (403)
- [ ] Empty price_history → card not shown or shows zeros
- [ ] Categories sorted by record count descending

## Database

### Migration
- [ ] `cross_account_pricing_stats` view created successfully
- [ ] View aggregates across all accounts (no account_id filter)
- [ ] Groups by category, name, condition
- [ ] Computes: count, avg, min, max, median, avg_days_to_sell, sold/unsold counts

### Seed Script
- [ ] `scripts/seed-cross-account-data.ts` runs without errors
- [ ] Creates 3 accounts with 30-50 price_history records each
- [ ] Covers 5 categories: Furniture, Jewelry & Silver, China & Crystal, Clothing & Shoes, Collectibles & Art

## API Tests (Automated)
- [ ] /api/pricing/cross-account returns 401 for unauthenticated
- [ ] /api/pricing/cross-account returns 403 for starter tier
- [ ] /api/pricing/cross-account returns 403 for standard tier
- [ ] /api/pricing/cross-account returns 400 for missing category
- [ ] /api/pricing/cross-account returns stats with category fallback
- [ ] /api/pricing/cross-account returns null when insufficient data
- [ ] /api/pricing/cross-account queries without account_id filter
- [ ] /api/pricing/cross-account uses ilike for name matching
- [ ] /api/admin/network-stats returns 401 for unauthenticated
- [ ] /api/admin/network-stats returns 403 for non-superadmin
- [ ] /api/admin/network-stats returns network stats for superadmin
- [ ] /api/admin/network-stats fetches from price_history table

## Mobile
- [ ] Market Intelligence panel responsive (stats grid stacks on mobile)
- [ ] UpgradePrompt renders correctly on mobile
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: 8 cross-account API tests + 4 admin network-stats tests
- **Manual**: Full flow, tier gating, admin view
