# Consignor Management — PRD

**Status:** Implemented

## Tier Requirement

Consignor management requires Starter tier or above. Solo users cannot access consignors (blocked by `requireFeature('consignor_mgmt')` on the page and `canUseFeature(tier, 'consignor_mgmt')` on the API).

## Consignor Creation

**Required fields:** `account_id`, `location_id`, `name`, `intake_date`, `expiry_date`, `grace_end_date`

**Optional fields:** `phone`, `email`, `notes`, `split_store`, `split_consignor`

**Defaults from location:** `default_split_store` (60), `default_split_consignor` (40), `agreement_days` (60), `grace_days` (3). The new consignor form pre-fills dates: `intake_date` = today, `expiry_date` = today + agreement_days, `grace_end_date` = expiry_date + grace_days.

**Split validation:** Store + consignor splits must equal 100%. Live validation in the form.

**API:** POST `/api/consignors` with `created_by` set to authenticated user ID. Returns 201.

## Agreement Email

**Trigger:** Manual — owner clicks "Send Agreement" or "Resend Agreement" button on consignor detail page.

**Content:** Store header (name, address, city, state), consignor greeting, agreement details (intake/expiry/grace dates, splits), items table (name, category, condition — **NO prices shown to consignor**), "How It Works" section, pickup instructions, contact info.

**Flow:** Creates `agreements` row → sends email via Resend → updates `email_sent_at`. If email fails, agreement record still exists.

**Post-intake prompt:** `IntakeAgreementPrompt` component shows "Ready to send the agreement email?" with Send/Skip buttons after completing item intake.

## Item Intake

`IntakeQueue` component on `/dashboard/consignors/[id]/intake`:
- Multi-item queue with per-row photo identification
- Photo compress → upload → AI identifies name/category/condition/description
- Name auto-capitalizes on blur
- Category-specific description hints for high-variance categories
- Enter key navigation: name → category → next row
- "Save All" posts each item to `/api/items`
- Items created with `status: 'pending'`, `consignor_id` linked

## Consignor List

- Filtered by `location_id` (from LocationContext)
- Ordered by `created_at` descending
- Each row shows item count via `items:items(count)` join
- Status tracking: `active`, `expired`, `grace`, `closed`

## Expiry Notifications

- Cron: `/api/agreements/notify-expiring` finds consignors expiring in 3 days
- Sends reminder email to consignors with email addresses
- Skips already-notified consignors (checks `agreements.email_sent_at`)

## Sidebar Badge

Amber badge on "Consignors" nav item showing count of expiring (≤7 days) or in-grace consignors. Uses single-query endpoint `/api/consignors/expiring-count`.
