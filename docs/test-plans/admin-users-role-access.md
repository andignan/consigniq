# Admin Users — Role-Based Access Manual Test Plan

## Prerequisites
- Three test accounts with platform_role: super_admin, support, finance
- ConsignIQ System account exists with is_system=true and at least one location

---

## Test 1: Super Admin — Full Access

**Login as:** super_admin

1. Navigate to `/admin/users`
2. **Verify:** "Add User" button is visible
3. **Verify:** Platform Role column is visible in the table
4. **Verify:** "Set role" links appear for users without platform roles
5. **Verify:** Clicking a platform role badge opens the role editing dropdown

### Test 1a: Create Customer User
1. Click "Add User"
2. **Verify:** Customer/Platform radio group is visible
3. **Verify:** "Customer User" is selected by default
4. **Verify:** Account Name, Tier, Account Type fields are visible
5. Fill in: Email, Full Name, Account Name, Tier=Shop, Type=Paid
6. Click "Create User"
7. **Verify:** User created successfully, appears in table with new account

### Test 1b: Create Platform User
1. Click "Add User"
2. Select "Platform User" radio
3. **Verify:** Account Name, Tier, Account Type fields are hidden
4. **Verify:** Platform Role dropdown is visible
5. Fill in: Email, Full Name, Platform Role=Support
6. Click "Create User"
7. **Verify:** User created successfully
8. **Verify:** User's account is "ConsignIQ System" in table
9. **Verify:** User has "Support" platform role badge
10. **Verify:** New platform user can log in and is redirected to `/admin`

### Test 1c: Platform Role Editing
1. Find a user with a platform role
2. Click the role badge
3. **Verify:** Dropdown appears with None/Super Admin/Support/Finance options
4. Change role and confirm it updates

---

## Test 2: Support — Read-Only Platform Roles

**Login as:** support

1. Navigate to `/admin/users`
2. **Verify:** "Add User" button is NOT visible
3. **Verify:** Platform Role column IS visible
4. **Verify:** Platform role badges are shown but NOT clickable (no cursor-pointer)
5. **Verify:** "Set role" links do NOT appear for users without roles
6. **Verify:** Em-dash shown for users without platform roles

---

## Test 3: Finance — No Platform Role Visibility

**Login as:** finance

1. Navigate to `/admin/users`
2. **Verify:** "Add User" button is NOT visible
3. **Verify:** Platform Role column is NOT visible (only Email, Full Name, Account, Tier, Type columns)
4. **Verify:** Table renders correctly with 5 columns

---

## Test 4: Edge Cases

### Test 4a: Platform user creation fails gracefully
1. As super_admin, try creating a platform user when system account doesn't exist
2. **Verify:** Error message "System account not found" is shown

### Test 4b: Invalid platform role rejected
1. Via API directly, POST with `platform_role: 'invalid'`
2. **Verify:** 400 response with validation error
