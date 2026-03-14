# 60-Day Lifecycle Test Plan

## Scope
Consignor lifecycle: intake → active → expiring → expired → grace → donation eligible. `getLifecycleStatus()` function, lifecycle display across UI.

## Happy Path
1. Create consignor with 60-day agreement, 3-day grace
2. Verify status shows green with "Xd left" label
3. As days pass: yellow (≤14d), orange (≤7d), red (grace), gray (donation eligible)
4. Verify ConsignorCard progress bar advances correctly
5. Verify dashboard lifecycle alerts show expiring/grace/donation-eligible consignors

## Edge Cases
- [ ] Consignor created today with 0-day agreement → immediately expired
- [ ] Consignor with same intake_date and expiry_date → edge case handling
- [ ] Consignor with 0-day grace period → goes directly from expired to donation eligible
- [ ] Very long agreement (365+ days) → green with large day count
- [ ] Negative days remaining shows correctly (past expiry)
- [ ] progressPct is clamped to 0-100 (never negative, never > 100)
- [ ] Grace day count displays correctly ("Grace Day 1", "Grace Day 2", etc.)

## Unit Tests (Automated)
- [ ] `getLifecycleStatus()` returns green for >14 days remaining
- [ ] `getLifecycleStatus()` returns yellow for 8-14 days remaining
- [ ] `getLifecycleStatus()` returns orange for 1-7 days remaining
- [ ] `getLifecycleStatus()` returns red + isGrace for grace period
- [ ] `getLifecycleStatus()` returns gray + isDonationEligible after grace
- [ ] progressPct clamps correctly
- [ ] All COLOR_CLASSES keys have badge, bar, dot, ring properties

## UI Verification
- [ ] ConsignorCard shows correct lifecycle badge color
- [ ] Dashboard page shows "Expiring Soon" alert for ≤7 day consignors
- [ ] Dashboard shows "Grace Period" alert for grace consignors
- [ ] Dashboard shows "Donation Eligible" alert
- [ ] Consignor Report section in Reports uses lifecycle status correctly
- [ ] Aging Inventory report color-codes items by consignor expiry

## Current Status
- **Automated**: Full unit test coverage for `getLifecycleStatus()` and `COLOR_CLASSES`
- **Manual**: Visual verification of lifecycle badges and alerts
