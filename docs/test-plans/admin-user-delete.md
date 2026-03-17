# Manual Test Plan — Admin User Deletion

## Objective
Verify superadmins can delete individual users from the Admin > Accounts > [id] detail page.

## Prerequisites
- Logged in as a super_admin platform user
- At least one account with multiple users

## Test Cases

### 1. Remove button visible
- [ ] Navigate to Admin > Accounts > [any account]
- [ ] Scroll to Users section
- [ ] Verify "Remove" button appears next to each user (alongside "Reset Password")

### 2. Delete a customer user
- [ ] Click "Remove" on a non-owner user
- [ ] Verify confirmation dialog appears with user's name
- [ ] Confirm deletion
- [ ] Verify user disappears from the list
- [ ] Verify success message appears briefly

### 3. Cancel deletion
- [ ] Click "Remove" on a user
- [ ] Click "Cancel" on the confirmation dialog
- [ ] Verify user is NOT removed

### 4. Delete a platform user
- [ ] Navigate to Admin > Accounts > ConsignIQ System
- [ ] Click "Remove" on a non-super_admin platform user (e.g., Finance)
- [ ] Confirm deletion
- [ ] Verify user is removed from the list

### 5. Last super_admin protection
- [ ] Attempt to delete the only remaining super_admin
- [ ] Verify error message: "Cannot delete the last super admin"
- [ ] Verify user is NOT removed

### 6. Auth enforcement
- [ ] As a non-admin user, attempt DELETE `/api/admin/users/[userId]` directly
- [ ] Verify 401/403 response
