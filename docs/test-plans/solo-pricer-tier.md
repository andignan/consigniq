# Solo Pricer Tier — Manual Test Plan

## Prerequisites
- Solo tier account (account with tier = 'solo')
- At least one item saved to inventory

## 1. Sidebar Navigation

- [ ] Solo user sees only: Dashboard, Price Lookup, My Inventory, Settings
- [ ] Consignors, Reports, Payouts are NOT shown
- [ ] "Solo Pricer" subtitle appears below ConsignIQ brand
- [ ] Location switcher is NOT shown
- [ ] Upgrade CTA appears in sidebar footer: "Upgrade to Starter — full shop management. $49/month"
- [ ] Upgrade CTA links to /dashboard/settings?tab=account

## 2. Solo Dashboard

- [ ] Usage meter shows "X of 200 lookups used" with progress bar
- [ ] Progress bar color: green (normal), yellow (>75%), red (>90%)
- [ ] Reset date shown next to remaining count
- [ ] "Buy 50 more — $5" button appears when remaining <= 20
- [ ] "Price an Item" quick action links to /dashboard/pricing
- [ ] "My Items" quick action links to /dashboard/inventory with count
- [ ] Upgrade CTA card: "Running a consignment shop? ConsignIQ Starter..."

## 3. Usage Enforcement

- [ ] AI pricing calls work when under limit
- [ ] At limit: error message shows "You've used all 200 lookups this month"
- [ ] Reset date displayed in the at-limit message
- [ ] "Buy 50 more for $5" shown when at limit
- [ ] After buying 50 lookups, total available increases to 250
- [ ] Monthly reset clears ai_lookups_this_month, does NOT clear bonus_lookups_used
- [ ] Bonus lookups persist until used (not affected by monthly reset)

## 4. Solo Inventory

- [ ] Items saved without consignor_id (nullable)
- [ ] Columns visible: name, category, condition, price, date added, status
- [ ] Mark as Sold action works
- [ ] Archive action works (status = archived)
- [ ] CSV export produces: Item Name, Category, Condition, Suggested Price, Status, Date Added, Date Sold

## 5. Solo Settings

- [ ] Only billing tab shown (no Location Settings, no Staff management)
- [ ] Current plan shown as "Solo Pricer"
- [ ] Lookups used/remaining displayed
- [ ] Reset date shown
- [ ] "Buy 50 more lookups — $5" button present
- [ ] "Manage Billing" opens Stripe portal (if stripe_customer_id exists)
- [ ] Upgrade pricing cards shown for Starter/Standard/Pro

## 6. Feature Blocking

- [ ] Navigating to /dashboard/consignors shows redirect or empty state
- [ ] Navigating to /dashboard/reports shows redirect or empty state
- [ ] Navigating to /dashboard/payouts shows redirect or empty state

## 7. Upgrade Flow

- [ ] Clicking upgrade CTA leads to billing/checkout
- [ ] After upgrading to Starter, full navigation appears
- [ ] Consignor management features become available
