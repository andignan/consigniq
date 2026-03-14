# Password Flow — Manual Test Plan

## Prerequisites
- Admin account (superadmin)
- At least one regular user account
- Resend email delivery working

## 1. New User Invite (Password Setup)

- [ ] Admin creates a new user via /admin/users
- [ ] Invite email arrives with "You've been invited to ConsignIQ" subject
- [ ] Email contains "Set Up Your Account" button with setup link
- [ ] Clicking the link opens /auth/setup-password
- [ ] Page shows "Set Your Password" form with ConsignIQ branding
- [ ] "Verifying your invite link..." shown briefly while session establishes
- [ ] Form fields enabled once session verified
- [ ] Entering password <8 chars shows "Password must be at least 8 characters"
- [ ] Entering mismatched passwords shows "Passwords do not match"
- [ ] Entering valid matching passwords and submitting sets the password
- [ ] User is redirected to /dashboard after successful password set
- [ ] User can log out and log back in with the new password

## 2. Admin Reset Password

- [ ] Navigate to /admin/accounts/[id]
- [ ] Users list shows "Reset Password" button for each user
- [ ] Clicking "Reset Password" shows success message "Reset email sent to [email]"
- [ ] User receives email with "Reset your ConsignIQ password" subject
- [ ] Email contains "Reset Password" button with reset link
- [ ] Clicking the reset link opens /auth/setup-password
- [ ] User can set a new password via the form
- [ ] After setting password, user is redirected to /dashboard
- [ ] Old password no longer works
- [ ] New password works for login

## 3. Forgot Password (Login Page)

- [ ] Login page shows "Forgot your password?" link below password field
- [ ] Clicking it reveals inline email input + "Send Reset Link" button
- [ ] Email field pre-fills with email from login form (if entered)
- [ ] Submitting with valid email shows "Check your email for a reset link"
- [ ] Submitting with unknown email also shows success (no user enumeration)
- [ ] User receives reset email with branded template
- [ ] Reset link opens /auth/setup-password
- [ ] User can set new password and is redirected to /dashboard

## 4. Security

- [ ] /api/admin/users/reset-password requires superadmin auth (returns 401/403 otherwise)
- [ ] /api/auth/forgot-password is accessible without auth (under /api/auth/*)
- [ ] /api/auth/forgot-password returns 200 for unknown emails (no enumeration)
- [ ] Setup password page requires valid token in URL hash
- [ ] Expired/invalid tokens show appropriate Supabase error
- [ ] Reset links expire after 24 hours
