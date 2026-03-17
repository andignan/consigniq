# Manual Test Plan — Platform User System Location Auto-Creation

## Objective
Verify that creating a platform user (Support, Finance, Super Admin) via the Admin > Users > Add User flow succeeds even when the system account has no pre-existing location.

## Prerequisites
- Logged in as a super_admin platform user
- Access to Admin > Users page
- ConsignIQ System account exists with `is_system = true`

## Test Cases

### 1. Create platform user when system location exists
- [ ] Navigate to Admin > Users
- [ ] Click "Add User"
- [ ] Select "Platform User" radio
- [ ] Enter email, full name, select role (e.g., Finance)
- [ ] Click "Create User"
- [ ] Verify 201 response, user appears in table
- [ ] Verify user has correct `platform_role` in the table

### 2. Create platform user when system location does NOT exist
- [ ] (Optional) Delete the system location from Supabase if possible in test env
- [ ] Repeat steps from Test 1
- [ ] Verify user is created successfully (no "System location not found" error)
- [ ] Verify a "System" location was auto-created for the system account
- [ ] Verify the new platform user is assigned to this auto-created location

### 3. Customer user creation unaffected
- [ ] Click "Add User"
- [ ] Select "Customer User" radio
- [ ] Fill in email, name, account name, tier, account type
- [ ] Click "Create User"
- [ ] Verify account, location, and user are all created normally

### 4. Permission enforcement
- [ ] Log in as a Support platform user (not super_admin)
- [ ] Verify "Add User" button is not shown
- [ ] Attempt POST to `/api/admin/users` with `platform_role` in body
- [ ] Verify 403 "Only super admins can create platform users"

## Regression
- [ ] Existing platform users (Super Admin, Support) still function correctly
- [ ] Admin sidebar, admin pages render without errors
