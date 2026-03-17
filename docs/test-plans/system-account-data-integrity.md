# Manual Test Plan — System Account Data Integrity Fix

## Objective
Verify that all platform users (Super Admin, Support, Finance) are correctly linked to the single ConsignIQ System account after the data fix.

## Prerequisites
- SQL fix has been run in Supabase SQL Editor
- Logged in as Super Admin

## Test Cases

### 1. Verify single system account
- [ ] Run: `SELECT id, name, is_system FROM accounts WHERE name ILIKE '%system%'`
- [ ] Expect: exactly 1 row with `is_system = true`

### 2. Verify all 3 platform users on same account
- [ ] Navigate to Admin > Accounts > ConsignIQ System
- [ ] Verify Users section shows 3 users: Admin, Support, Finance
- [ ] Verify all have the same account_id

### 3. Verify no null location_id
- [ ] Run: `SELECT email, location_id FROM users WHERE platform_role IS NOT NULL`
- [ ] Expect: all 3 rows have non-null location_id pointing to the same location

### 4. Verify Admin > Users table
- [ ] Navigate to Admin > Users
- [ ] Verify all 3 platform users show Platform Role badges
- [ ] Verify Tier and Type columns show `—` for platform users

### 5. Verify Finance invite
- [ ] Navigate to Admin > Accounts > ConsignIQ System
- [ ] Click "Reset Password" next to Finance user
- [ ] Verify success message appears
- [ ] Verify finance@consigniq.com receives the password setup email

### 6. Verify no orphaned data
- [ ] Run: `SELECT * FROM locations WHERE account_id NOT IN (SELECT id FROM accounts)`
- [ ] Expect: 0 rows (no orphaned locations)
