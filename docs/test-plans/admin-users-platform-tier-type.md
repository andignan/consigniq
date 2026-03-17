# Manual Test Plan — Admin Users Table: Hide Tier/Type for Platform Users

## Objective
Verify that platform user rows in the Admin > Users table show a dash (—) for Tier and Type columns, while customer user rows display their badges normally.

## Prerequisites
- Logged in as a super_admin or support platform user
- At least one platform user and one customer user exist

## Test Cases

### 1. Platform user row shows dashes
- [ ] Navigate to Admin > Users
- [ ] Find a user with a Platform Role (e.g., super_admin, support, finance)
- [ ] Verify the Tier column shows `—` (not a tier badge)
- [ ] Verify the Type column shows `—` (not Paid/Trial/Complimentary badge)

### 2. Customer user row shows badges
- [ ] Find a user without a Platform Role
- [ ] Verify the Tier column shows a colored badge (solo/shop/enterprise)
- [ ] Verify the Type column shows a badge (Paid/Trial/Complimentary)

### 3. Mixed table renders correctly
- [ ] With both platform and customer users visible in the table
- [ ] Verify dashes and badges appear on the correct rows
- [ ] Verify table columns are aligned properly

### 4. Filters still work
- [ ] Filter by Tier (e.g., "Shop") — platform users should not appear (they have no meaningful tier)
- [ ] Filter by Type (e.g., "Paid") — platform users should not appear
- [ ] Clear filters — both platform and customer users visible
