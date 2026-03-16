# Email System — PRD

**Status:** Implemented

## Infrastructure

**Provider:** Resend (`RESEND_API_KEY` env var)
**From address:** `ConsignIQ <${RESEND_FROM_EMAIL}>` (defaults to `noreply@consigniq.com`)
**Singleton:** `sendEmail({ to, subject, text, html })` in `src/lib/email.ts` — lazy-initializes Resend client

**Pattern:** All email sends are wrapped in try/catch. Email failure never blocks the main operation — it's logged and the API returns success. This "non-critical email" pattern is consistent across all routes.

## All Email Templates

All templates in `src/lib/email-templates.ts`. Each returns `{ subject, text, html }` with dual plain-text + HTML. HTML uses ConsignIQ branded header where applicable.

| # | Template Function | Trigger | Recipient | Key Content |
|---|---|---|---|---|
| 1 | `buildAgreementEmail()` | Manual: "Send Agreement" button | Consignor | Store header, dates, splits, item list (**no prices**), pickup instructions |
| 2 | `buildExpiryReminderEmail()` | Cron: `/api/agreements/notify-expiring` (3 days before expiry) | Consignor | Store name, expiry date, grace end date, store phone |
| 3 | `buildInviteEmail()` | Admin creates new user | New user | Account name, tier, setup password link |
| 4 | `buildPasswordResetEmail()` | Admin reset password or forgot password | User | Reset password CTA, 24-hour expiry note |
| 5 | `buildUpgradeEmail()` | Webhook: `checkout.session.completed` (new subscription) | Owner | Plan name, price, dashboard CTA |
| 6 | `buildCancellationEmail()` | Webhook: `customer.subscription.deleted` | Owner | Previous tier, data-safe notice, resubscribe CTA |
| 7 | `buildPaymentFailedEmail()` | Webhook: `invoice.payment_failed` (attempts 1-2) | Owner | Update payment method CTA |
| 8 | `buildPaymentFinalWarningEmail()` | Webhook: `invoice.payment_failed` (attempt 3+) | Owner | Final warning, subscription will be cancelled |
| 9 | `buildAccountDeletedEmail()` | Admin: `/api/admin/accounts/delete` | Owner | Paid: scheduled for deletion. Free: permanently deleted |
| 10 | `buildGraceReminderEmail()` | Cron: `/api/billing/check-grace-periods` (3 days before period_end) | Owner | Tier label, access end date, resubscribe CTA |
| 11 | `buildAccessEndedEmail()` | Server-side: grace→limited transition | Owner | Tier label, data preserved, resubscribe CTA |
| 12 | `buildWelcomeBackEmail()` | Webhook: `checkout.session.completed` (resubscription) | Owner | Tier label, data restored, dashboard CTA |

## Email-Triggering Endpoints

| Endpoint | Emails Sent | Auth |
|---|---|---|
| `/api/agreements/send` | Agreement email to consignor | Session auth + tier gate |
| `/api/agreements/notify-expiring` | Expiry reminders to consignors | CRON_SECRET |
| `/api/billing/webhook` | Upgrade, cancellation, payment failed, welcome back | Stripe signature |
| `/api/billing/check-grace-periods` | Grace reminders, access ended | CRON_SECRET |
| `/api/admin/users` POST | Invite email to new user | Superadmin |
| `/api/admin/users/reset-password` | Password reset email | Superadmin |
| `/api/auth/forgot-password` | Password reset email | Public (no auth) |
| `/api/admin/accounts/delete` | Account closed email | Superadmin |
| `/api/trial/check-expiry` | Trial expiry reminder | CRON_SECRET |

## Resend Configuration

**Required env vars:**
- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM_EMAIL` — sender address (optional, defaults to `noreply@consigniq.com`)

**Not used:** Supabase built-in email (replaced with Resend for full control over branding and delivery). Supabase's `auth.admin.generateLink()` generates the link, but the email is sent via Resend, not Supabase's SMTP.

## Invite Link Security Rule

On `/auth/setup-password`, if an `access_token` exists in the URL hash:

1. Call `signOut({ scope: 'global' })` to clear ALL active browser sessions (not just the local one)
2. Wait 100ms after signOut to ensure full completion
3. Decode the JWT from the access_token to extract the intended email
4. Call `setSession()` with the token
5. After session is established, verify `data.user.email === expectedEmail` — if they don't match, show the expired error

This prevents a logged-in user (e.g., admin) from accidentally changing the wrong account's password when clicking a new user's invite link.
