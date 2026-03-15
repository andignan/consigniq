# 60-Day Consignor Lifecycle — PRD

**Status:** Implemented

## Overview

Each consignor agreement runs for a configurable period (default 60 days) from intake. The lifecycle drives status badges, dashboard alerts, expiry notifications, and donation eligibility.

## Lifecycle States

Computed by `getLifecycleStatus(intakeDateStr, expiryDateStr, graceEndStr)` in `src/types/index.ts`.

| State | Condition | Color | Label |
|---|---|---|---|
| Active (safe) | >14 days remaining | Green | "Nd left" |
| Expiring soon | 8-14 days remaining | Yellow | "Nd left" |
| Expiring urgent | 1-7 days remaining | Orange | "Nd left" |
| Expired | Past expiry, not in grace | Red | "Expired" |
| Grace period | Past expiry, within grace end | Red | "Grace Day N" |
| Donation eligible | Past grace end | Gray | "Donation Eligible" |

## Day Calculations

- **All dates parsed as local time** by appending `T00:00:00` (timezone bugfix)
- `daysElapsed = floor((today - intake) / msPerDay)`
- `daysRemaining = floor((expiry - today) / msPerDay)`
- `totalDays = floor((expiry - intake) / msPerDay)`
- `progressPct = clamp(0, 100, daysElapsed / totalDays * 100)`

## Color Classes

`COLOR_CLASSES` maps each color to Tailwind class sets: `badge`, `bar`, `dot`, `ring`. Used throughout consignor cards, lifecycle progress bars, and dashboard alerts.

## Grace Period

- Default: 3 days (configurable per location via `grace_days`)
- Calculated as: `grace_end_date = expiry_date + grace_days`
- During grace: consignor can pick up unsold items
- After grace: items eligible for donation

## Expiry Notifications

`/api/agreements/notify-expiring` (CRON_SECRET auth):
- Finds consignors where `expiry_date = today + 3 days` with email address
- Skips consignors who already have an agreement with `email_sent_at` set
- Sends `buildExpiryReminderEmail()` with store name, phone, expiry date, grace end date
- Designed for daily cron invocation

## Markdown Schedule Integration

If `markdown_enabled` on the location:
- Day 31: 25% off original price
- Day 46: 50% off original price
- `effective_price = price * (1 - current_markdown_pct / 100)`
- Original price always preserved

## Expiring Badge Count

Sidebar shows amber badge with count of consignors that are:
- Expiring within 7 days (expiry date is within 7 days AND not yet past), OR
- Currently in grace period (past expiry, within grace end)

Single-query endpoint: `/api/consignors/expiring-count` (scoped by account_id, optional location_id filter).

## Configurable Per Location

- `agreement_days`: default 60 (how long the consignment period lasts)
- `grace_days`: default 3 (pickup window after expiry)
- `markdown_enabled`: toggle for automatic price reductions
