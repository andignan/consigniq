# Manual Test Plan — ConfirmModal + Email Fixes

## Objective
Verify: (1) platform invite email shows "ConsignIQ System", (2) all native confirm() dialogs replaced with styled ConfirmModal, (3) email header uses dark navy.

## Test Cases

### 1. Platform invite email account name
- [ ] Create a new platform user via Admin > Users > Add User > Platform
- [ ] Check the invite email received
- [ ] Verify account name shows "ConsignIQ System" (not "ConsignIQ (Platform)")
- [ ] Verify Plan row is still omitted

### 2. Email header background
- [ ] Trigger any email (invite, agreement, password reset)
- [ ] Verify the header section has dark navy (#071020) background
- [ ] Verify white text and teal "IQ" are legible

### 3. Admin account detail — Remove user modal
- [ ] Navigate to Admin > Accounts > [any account] > Users
- [ ] Click "Remove" on a user
- [ ] Verify styled modal appears (not browser native dialog)
- [ ] Verify modal shows user name and "This will delete their login"
- [ ] Verify Cancel button closes modal without action
- [ ] Verify Remove button (red) deletes user and closes modal

### 4. Settings — Remove team member modal
- [ ] Navigate to Settings > Account Settings > Team Members
- [ ] Click "Remove" on a team member
- [ ] Verify styled modal appears with member name
- [ ] Verify Cancel and Remove buttons work correctly

### 5. Inventory — Delete item modal
- [ ] Navigate to Inventory
- [ ] Click the trash icon on an item
- [ ] Verify styled modal appears with item name
- [ ] Verify "This cannot be undone" message
- [ ] Verify Cancel and Delete buttons work correctly

### 6. No native confirm() remaining
- [ ] Search codebase for `confirm(` in .tsx files
- [ ] Verify zero results
