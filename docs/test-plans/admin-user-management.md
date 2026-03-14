# Admin User Management — Manual Test Plan

## Prerequisites
- Superadmin account (is_superadmin = true)
- At least one regular user account

## 1. Admin Users Page (/admin/users)

- [ ] "Users" appears in admin sidebar between Overview and Accounts
- [ ] Page loads all users across all accounts
- [ ] Table columns: Email, Full Name, Account Name, Tier, Account Type
- [ ] Search filters by email or name (type and results update)
- [ ] Account Type filter dropdown works (Paid/Trial/Complimentary)
- [ ] Tier filter dropdown works (Solo/Starter/Standard/Pro)
- [ ] Trial accounts show days remaining or "Expired" in badge
- [ ] Complimentary accounts show complimentary tier in badge

## 2. Add User Flow

- [ ] "Add User" button opens modal
- [ ] Required fields: Email, Full Name, Account Name
- [ ] Tier dropdown: Solo, Starter, Standard, Pro
- [ ] Account Type dropdown: Trial, Complimentary
- [ ] When "Complimentary" selected, Complimentary Tier dropdown appears
- [ ] Submit with missing fields shows validation error
- [ ] Successful submit creates:
  - [ ] accounts row with correct tier and account_type
  - [ ] locations row (name = "[account_name] - Main", default splits 60/40)
  - [ ] Supabase auth user (email_confirm: true)
  - [ ] users row (role: owner, linked to account + location)
- [ ] New user appears in table after creation
- [ ] Error if email already exists in auth system

## 3. Account Detail Actions (/admin/accounts/[id])

- [ ] Account type badge shown (Paid=green, Trial=blue, Complimentary=purple)
- [ ] Trial accounts show trial_ends_at date and days remaining
- [ ] "Extend Trial" button visible for trial accounts
  - [ ] Clicking adds 30 days to trial_ends_at
  - [ ] If trial expired, extends from now + 30 days
  - [ ] If trial active, extends from current end + 30 days
- [ ] "Convert to Complimentary" button
  - [ ] Sets account_type = complimentary, is_complimentary = true
  - [ ] Sets complimentary_tier to current tier
- [ ] "Convert to Paid" button
  - [ ] Sets account_type = paid
  - [ ] Clears complimentary flags
- [ ] "Disable Account" / "Enable Account" toggle
  - [ ] Disable sets status = inactive
  - [ ] Enable sets status = active
  - [ ] Disabled accounts cannot access dashboard
- [ ] Tier dropdown now includes "Solo" option
- [ ] Changing tier to Solo applies solo restrictions

## 4. Data Integrity

- [ ] Created accounts appear in /admin/accounts list
- [ ] Created users appear in /admin/users list
- [ ] Account detail shows correct location and user counts
- [ ] Disabled accounts show in admin but users see expired page

## 5. Security

- [ ] Non-superadmin cannot access /admin/users (redirect to /dashboard)
- [ ] Unauthenticated cannot access /api/admin/users (401)
- [ ] Non-superadmin gets 403 on /api/admin/users
- [ ] All admin API routes require superadmin auth
