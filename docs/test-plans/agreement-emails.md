# Agreement Emails Test Plan

## Scope
Consignment agreement generation, email delivery via Resend, and expiry notifications.

## Prerequisites
- Resend API key configured (`RESEND_API_KEY` in env)
- `RESEND_FROM_EMAIL` set (or defaults to `noreply@consigniq.com`)
- At least one consignor with an email address
- At least one item consigned to that consignor
- Location settings configured (name, address, agreement_days, grace_days)

## Happy Path — Send Agreement from Detail Page

1. Navigate to a consignor detail page (`/dashboard/consignors/[id]`)
2. Verify "Send Agreement" button is visible in the actions bar
3. Click "Send Agreement"
4. Confirmation modal appears showing:
   - Consignor name and email
   - Item count to be included
5. Click "Send" in modal
6. Verify success toast appears: "Agreement sent to [email]"
7. Verify button text changes to "Resend Agreement" with "Last sent [date]"
8. Check email inbox — verify email received with:
   - Store name and address in header
   - Consignor name in greeting
   - Agreement details (intake date, expiry, grace end, split %)
   - Full item list with name, category, condition (NO prices)
   - How It Works section with agreement_days and grace_days
   - Store phone in contact section

## Happy Path — Agreement Prompt After Intake

1. Navigate to a consignor's intake page
2. Add 2-3 items and click "Save" then "Done"
3. On redirect to detail page, verify:
   - Green success banner shows item count
   - Amber agreement prompt appears below: "Ready to send the agreement email to [name]?"
   - "Send" and "Skip" buttons visible
4. Click "Send" — verify success message
5. Repeat intake, click "Skip" — verify prompt dismisses

## Resend Agreement

1. Go to a consignor who already received an agreement
2. Verify button shows "Resend Agreement" with last sent date
3. Click and confirm — verify new email is sent

## Error Cases

### No Email on Consignor
1. Navigate to a consignor with no email address
2. Click "Send Agreement"
3. Verify error toast: "No email address on file for this consignor"
4. Verify no modal opens

### No Email via API
1. POST to `/api/agreements/send` with a consignor_id that has no email
2. Verify 400 response with helpful message

### Unauthenticated
1. Call `/api/agreements/send` without session
2. Verify 401 response

### Consignor Not Found
1. POST with invalid consignor_id
2. Verify 404 response

### Resend API Key Missing
1. Remove `RESEND_API_KEY` from env
2. Attempt to send — verify 500 with "RESEND_API_KEY is not set"

## Email Content Verification

### Agreement Email
- [ ] Subject: "Consignment Agreement — [Store Name]"
- [ ] Store name and full address in header
- [ ] Consignor name in greeting
- [ ] Intake date, expiry date, grace end date formatted nicely
- [ ] Split percentages: "X% to you / Y% to store"
- [ ] Item table with name, category, condition columns
- [ ] Total item count
- [ ] "How It Works" section with agreement_days and grace_days
- [ ] Pickup instructions with grace end date
- [ ] Store phone number in contact section
- [ ] ConsignIQ branding footer
- [ ] NO prices shown anywhere (consignor never sees pricing)
- [ ] Both HTML and plain-text versions present

### Expiry Reminder Email
- [ ] Subject: "Your consignment agreement expires soon — [Store Name]"
- [ ] Consignor name in greeting
- [ ] Expiry date clearly stated
- [ ] Grace end date as pickup deadline
- [ ] Store phone for questions

## Expiry Notification Endpoint

1. POST to `/api/agreements/notify-expiring`
2. Verify it finds consignors with expiry_date = today + 3 days
3. Verify it skips consignors who already received notifications
4. Verify it skips consignors without email addresses
5. Verify response: `{ sent: N, skipped: N }`

## Data Verification

1. After sending agreement, check `agreements` table:
   - `account_id` matches current user's account
   - `consignor_id` matches target consignor
   - `generated_at` is set to current timestamp
   - `expiry_date` matches consignor's expiry date
   - `grace_end` matches consignor's grace end date
   - `email_sent_at` is set after successful send

## Cross-Account Isolation

1. Log in as Account A, send agreement for their consignor
2. Log in as Account B, verify they cannot see or interact with Account A's agreements
3. API enforces account_id scoping on all queries

## Mobile
1. Verify "Send Agreement" button is accessible on mobile
2. Verify confirmation modal is usable on small screens
3. Verify agreement prompt after intake works on mobile
