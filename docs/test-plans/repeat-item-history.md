# Repeat Item History Test Plan

## Scope
Price history recording on item sale, "Priced Before" panel on inventory pricing page, similar items API endpoint.

## Happy Path — Price History Recording
1. Navigate to Inventory, select a priced item
2. Click "Mark Sold", enter sold price
3. Verify item status changes to "sold"
4. Check `price_history` table — verify a new row with correct `account_id`, `location_id`, `item_id`, `category`, `name`, `condition`, `sold_price`, `sold_at`, `days_to_sell`, `sold: true`
5. Verify `days_to_sell` = difference between `priced_at` and `sold_date`

## Happy Path — Priced Before Panel
1. Sell at least 2 items in the same category (e.g., "Furniture")
2. Navigate to a pending item in the same category → click "Price"
3. Verify "Priced Before" panel appears below item details card
4. Verify panel shows similar sold items with: name, condition, sold price, days to sell, sold date
5. Verify average sold price is displayed at bottom
6. Verify average days to sell is displayed at bottom
7. Price the item — verify "Priced Before" panel is still visible

## Happy Path — Similar Items API
1. Call `GET /api/price-history?category=Furniture` — verify returns sold items in that category
2. Call `GET /api/price-history?category=Furniture&name=Oak` — verify returns items matching name
3. Verify results sorted by `sold_at` descending (most recent first)
4. Verify `exclude_item_id` param excludes the specified item from results

## Edge Cases
- [ ] No price history exists for category — "Priced Before" panel does not appear
- [ ] Only 1 item in history — panel shows singular "1 similar item sold"
- [ ] Item sold without being priced first (`priced_at` is null) — `days_to_sell` is null
- [ ] Name search returns 0 results — falls back to broader category search
- [ ] Limit parameter capped at 50 even if higher value requested
- [ ] Default limit is 10 when not specified
- [ ] Panel shows at most 5 items in the UI (even if API returns more)
- [ ] Price history write is non-blocking — if insert fails, sold update still succeeds

## Column Type Constraint
`price_history.priced_at` and `sold_at` are `timestamptz` columns (NOT numeric). Migration `20260314050000` converted these from the original numeric type. The items route writes ISO timestamp strings (e.g., `"2026-03-01T14:30:00.000Z"` for `priced_at`, `"2026-03-12"` for `sold_at`), which PostgreSQL accepts as valid `timestamptz` input.

### Manual Verification
1. Mark a priced item as sold in the UI
2. Open Supabase Dashboard → Table Editor → `price_history`
3. Find the new row by `item_id`
4. Verify `priced_at` is a valid timestamp (e.g., `2026-03-01 14:30:00+00`)
5. Verify `sold_at` is a valid timestamp (e.g., `2026-03-12 00:00:00+00`)
6. Verify neither field contains a raw number

## Role Enforcement
- [ ] Both owner and staff can see "Priced Before" panel when pricing items
- [ ] Price history is scoped by `account_id` — cannot see other accounts' history
- [ ] API returns 401 for unauthenticated requests
- [ ] API returns 404 if user profile not found

## API Tests (Automated)
- [ ] GET `/api/price-history` returns 401 unauthenticated
- [ ] GET `/api/price-history` returns 404 if profile not found
- [ ] GET `/api/price-history` returns 400 without category
- [ ] GET `/api/price-history` returns history for category search
- [ ] GET `/api/price-history` uses ilike when name provided
- [ ] GET `/api/price-history` respects exclude_item_id
- [ ] GET `/api/price-history` caps limit at 50
- [ ] GET `/api/price-history` defaults limit to 10
- [ ] PATCH `/api/items` with status=sold writes to price_history

## Mobile
- [ ] "Priced Before" panel is full-width on mobile viewport
- [ ] Panel items truncate long names on small screens
- [ ] Scrolling works properly with panel above photo upload

## Current Status
- **Automated**: 8 API tests for `/api/price-history` + 4 price_history write tests in items (incl. timestamp type regression test)
- **Manual**: Full UI workflow verification required with sold item history + column type verification in Supabase
