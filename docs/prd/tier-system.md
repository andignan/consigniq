# Tier System — PRD

**Status:** Implemented

## Tier Feature Matrix

| Feature | Solo ($9) | Shop ($79) | Enterprise ($129) |
|---|---|---|---|
| AI pricing lookups | 200/mo | Unlimited | Unlimited |
| Price Lookup | Y | Y | Y |
| Photo identification | Y | Y | Y |
| Save to inventory | Y | Y | Y |
| CSV export | Y | Y | Y |
| Consignor management | - | Y | Y |
| 60-day lifecycle | - | Y | Y |
| Agreement emails | - | Y | Y |
| Payouts | - | Y | Y |
| Reports & analytics | - | Y | Y |
| Markdown schedules | - | Y | Y |
| Staff management | - | Y | Y |
| Repeat item history | - | Y | Y |
| Email notifications | - | Y | Y |
| Multi-location | - | Y | Y |
| Cross-customer pricing | - | - | Y |
| Community pricing feed | - | - | Y |
| All Locations dashboard | - | - | Y |
| API access | - | - | Y |

## How canUseFeature() Works

`TIER_ORDER = { solo: 0, shop: 1, enterprise: 2 }`

`canUseFeature(tier, feature)` → `TIER_ORDER[tier] >= TIER_ORDER[FEATURE_REQUIRED_TIER[feature]]`

Simple numeric comparison. A higher tier inherits all features of lower tiers.

`getUpgradeMessage(feature)` → human-readable string: `"{label} requires the {tierLabel} plan (${price}/mo). Upgrade to unlock this feature."`

`getTotalAvailableLookups(tier, bonusLookups)` → returns `aiPricingLimit + bonusLookups` for solo, `null` (unlimited) for shop/enterprise.

## How requireFeature() Works

Server-side guard in `src/lib/tier-guard.ts`:
1. Creates server Supabase client, gets authenticated user
2. Queries `users.accounts(tier)` to get account tier
3. Calls `canUseFeature(tier, feature)`
4. If blocked: `redirect('/dashboard')`

Used at top of: consignors page, reports layout, payouts layout.

## API-Level Tier Enforcement

`canUseFeature(tier, feature)` checks in route handlers return 403:
- `/api/consignors` GET+POST → `consignor_mgmt`
- `/api/agreements/send` POST → `agreements`
- `/api/payouts` GET+PATCH → `payouts`
- `/api/pricing/cross-account` GET → `cross_customer_pricing`

## Account Type Logic

**`isAccountActive(account)`:**
- False: `suspended`, `cancelled`, `deleted` status
- True: `paid`, `complimentary`, `cancelled_grace`, `cancelled_limited`
- Trial: true only if `trial_ends_at > now()`

**`getEffectiveTier(account)`:**
- `complimentary` → returns `complimentary_tier`
- `cancelled_grace` → returns `cancelled_tier` (full access during grace)
- `cancelled_limited` → returns `'solo'` (restricted)
- All others → returns `account.tier`

**`canAccountUseFeature(account, feature)`:** combines `isAccountActive()` + `getEffectiveTier()` + `canUseFeature()`.

## Usage Limits

- Solo: 200 AI lookups/month. Tracked via `accounts.ai_lookups_this_month` + `ai_lookups_reset_at`. Resets after 30 days.
- Bonus lookups: `accounts.bonus_lookups` (purchased) - `bonus_lookups_used` (consumed). 50-lookup packs for $5. Persist until used.
- `isLookupLimitReached()`: false for unlimited tiers. For solo: `(usedThisMonth + bonusUsed) >= (200 + bonusLookups)`.

## Trial Accounts

- 30-day free trial with full tier access
- `TrialBanner`: color-coded days remaining (green >14, yellow 7-14, orange <7)
- `TrialExpiredPage`: full-screen lockout after `trial_ends_at` passes
- Cron: `/api/trial/check-expiry` sends reminder 1 day before expiry

## Cancelled Accounts

- `cancelled_grace`: full tier access until `subscription_period_end`
- `cancelled_limited`: solo-only access, data preserved
- See `/docs/prd/subscription-lifecycle.md` for details

## Tier Rename (March 2026)

Migration `20260316030000` renamed tiers:
- `starter` / `standard` → `shop`
- `pro` → `enterprise`
- `solo` unchanged

Migrated columns: `accounts.tier`, `accounts.complimentary_tier`, `accounts.cancelled_tier`. CHECK constraint updated to `(tier IN ('solo', 'shop', 'enterprise'))`.

**Stripe webhook backward-compat:** Removed 2026-03-17. Old tier name mapping (`starter`/`standard` → `shop`, `pro` → `enterprise`) was a temporary safety net for in-flight Stripe sessions during migration. No longer needed.

## Stripe Webhook Events

Handled events in `/api/billing/webhook`:
- `checkout.session.completed` — sets tier from metadata (accepts `solo`/`shop`/`enterprise` only), clears cancellation fields, detects resubscription (sends welcome-back vs upgrade email)
- `customer.subscription.updated` — syncs tier from metadata, updates `subscription_period_end`, detects reactivation from cancelled states
- `customer.subscription.deleted` — sets `cancelled_grace`, preserves previous tier in `cancelled_tier`, sends cancellation email
- `invoice.payment_failed` — sends payment failed email (escalates to final warning on attempt 3+)

Email templates used: `buildUpgradeEmail`, `buildCancellationEmail`, `buildPaymentFailedEmail`, `buildPaymentFinalWarningEmail`, `buildWelcomeBackEmail`. All non-critical (wrapped in try/catch).
