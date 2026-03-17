# Trial & Complimentary Accounts — Manual Test Plan

## Prerequisites
- Trial account (account_type = 'trial', trial_ends_at 30 days from creation)
- Complimentary account (account_type = 'complimentary', is_complimentary = true)
- Access to admin panel as superadmin

## 1. Trial Account — Active

- [ ] Trial banner appears on all dashboard pages
- [ ] Banner shows "Trial — X days remaining"
- [ ] Banner color: green (>14 days), yellow (7-14 days), orange (<7 days)
- [ ] "Upgrade Now" link in banner goes to /dashboard/settings?tab=account
- [ ] All features of the assigned tier work during trial
- [ ] Account_type shows as 'trial' in admin panel

## 2. Trial Account — Approaching Expiry

- [ ] At 1 day remaining, cron endpoint (/api/trial/check-expiry) sends reminder email
- [ ] Email subject: "Your ConsignIQ trial ends tomorrow"
- [ ] Email contains link to upgrade settings page
- [ ] Only sent once per account (cron is idempotent)

## 3. Trial Account — Expired

- [ ] After trial_ends_at passes, user sees full-screen "Your trial has ended" page
- [ ] Locked page shows tier options with pricing
- [ ] Each tier has a "Choose [tier]" button linking to Stripe checkout
- [ ] No access to dashboard features when trial expired
- [ ] After paying: account_type changes to 'paid', trial_ends_at cleared
- [ ] Full access restored immediately after payment

## 4. Complimentary Account

- [ ] Complimentary accounts bypass all tier checks
- [ ] Features available match complimentary_tier (e.g., complimentary_tier = 'enterprise' gives enterprise features)
- [ ] No billing prompts or trial banners shown
- [ ] Account_type shows as 'complimentary' in admin panel
- [ ] isAccountActive() returns true for complimentary accounts

## 5. Account Status Handling

- [ ] Suspended accounts (status = 'suspended') see trial expired page
- [ ] Cancelled accounts (status = 'cancelled') see trial expired page
- [ ] Active accounts work normally regardless of account_type

## 6. Admin Management of Trial/Complimentary

- [ ] Admin can create trial account via /admin/users → Add User
- [ ] Trial account gets trial_ends_at = now + 30 days
- [ ] Admin can create complimentary account with specific complimentary_tier
- [ ] Admin can extend trial (+30 days) from account detail page
- [ ] Admin can convert trial to complimentary
- [ ] Admin can convert complimentary to paid
- [ ] Admin can disable any account (sets status = inactive)
