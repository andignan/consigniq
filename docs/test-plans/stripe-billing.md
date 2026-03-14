# Stripe Billing & Tier Enforcement Test Plan

## Scope
Stripe-based subscription billing, tier-based feature gating, AI pricing usage tracking, and billing management UI in Settings.

## Tier Structure
- **Starter** (free): 50 AI pricing lookups/month, basic features
- **Standard** ($79/mo): Unlimited AI pricing, repeat item history, markdown schedules, email notifications
- **Pro** ($129/mo): Everything in Standard + cross-customer pricing, community feed, "All Locations" dashboard, API access

## Checkout Flow

### Happy Path
1. Log in as owner on starter tier
2. Navigate to Settings → Account tab
3. Verify tier badge shows "starter"
4. Verify usage meter shows "X of 50 AI pricing lookups used this month"
5. Verify two pricing cards: Standard ($79/mo) and Pro ($129/mo)
6. Click "Upgrade to Standard" → verify redirect to Stripe Checkout
7. Complete payment in Stripe → verify redirect to /dashboard?billing=success
8. Verify account tier updated to "standard" in Settings

### Edge Cases
- [ ] Staff users cannot access billing (403)
- [ ] Invalid tier in checkout request returns 400
- [ ] Stripe customer created on first checkout if none exists
- [ ] Existing Stripe customer reused on subsequent checkouts
- [ ] Cancel URL returns to Settings account tab

## Billing Portal

### Happy Path
1. Log in as owner on standard/pro tier
2. Navigate to Settings → Account tab
3. Click "Manage Billing" → verify redirect to Stripe Customer Portal
4. Verify portal allows: upgrade, downgrade, cancel, update payment method
5. After changes, return URL goes to Settings account tab

### Edge Cases
- [ ] Returns 404 if no stripe_customer_id (never subscribed)
- [ ] Staff users cannot open portal (403)

## Webhook Handling

### Events
- [ ] `checkout.session.completed` → updates account tier
- [ ] `customer.subscription.updated` → syncs tier from metadata
- [ ] `customer.subscription.deleted` → downgrades to starter
- [ ] `invoice.payment_failed` → logs warning, does NOT downgrade immediately
- [ ] Invalid webhook signature returns 400
- [ ] Missing signature returns 400
- [ ] Unhandled event types return 200

### Edge Cases
- [ ] Webhook endpoint excluded from auth middleware
- [ ] Raw body used for signature verification
- [ ] Returns 200 even if processing fails (prevents Stripe retries)

## AI Pricing Usage Tracking

### Happy Path
1. Log in as owner on starter tier with 0 lookups used
2. Run AI pricing on an item → verify count increments to 1
3. Repeat until 50 → verify 403 error with "limit_reached" message
4. Upgrade to standard → verify no limit enforced

### Edge Cases
- [ ] Counter resets after 30 days
- [ ] Standard/pro tiers bypass limit check entirely
- [ ] Usage meter in Settings shows correct count
- [ ] Progress bar colors: green (<80%), amber (80-95%), red (95%+)

## Feature Gating

### Starter Tier — Locked Features
- [ ] "Priced Before" panel on pricing page → shows UpgradePrompt for "standard"
- [ ] Markdown schedule toggle in Settings → shows UpgradePrompt for "standard"

### Standard Tier — Available Features
- [ ] "Priced Before" panel visible and functional
- [ ] Markdown schedule toggle available
- [ ] Cross-customer pricing → shows UpgradePrompt for "pro" (when implemented)

### Pro Tier — All Features
- [ ] All features available, no UpgradePrompt shown

### UpgradePrompt Component
- [ ] Shows lock icon and feature name
- [ ] Shows required tier and price
- [ ] "Upgrade" button links to /dashboard/settings?tab=account#billing
- [ ] Non-intrusive — replaces feature section, doesn't block page

## Billing UI in Settings

### Starter Tier View
- [ ] Usage meter visible with progress bar
- [ ] Two pricing cards: Standard and Pro with feature lists
- [ ] Each card has CTA button that triggers checkout
- [ ] "Free plan — no credit card required" text shown

### Standard Tier View
- [ ] No usage meter (unlimited)
- [ ] Pro upgrade card visible
- [ ] "Manage Billing" button opens Stripe portal

### Pro Tier View
- [ ] No usage meter (unlimited)
- [ ] No upgrade cards
- [ ] Only "Manage Billing" button shown

## API Tests (Automated)
- [ ] /api/billing/checkout returns 401 for unauthenticated user
- [ ] /api/billing/checkout returns 403 for staff users
- [ ] /api/billing/checkout returns 400 for invalid tier
- [ ] /api/billing/checkout creates session and returns URL
- [ ] /api/billing/checkout creates Stripe customer if none exists
- [ ] /api/billing/portal returns 401 for unauthenticated user
- [ ] /api/billing/portal returns portal URL for owner
- [ ] /api/billing/portal returns 404 if no stripe_customer_id
- [ ] /api/billing/webhook returns 400 for missing signature
- [ ] /api/billing/webhook returns 400 for invalid signature
- [ ] /api/billing/webhook updates tier on checkout.session.completed
- [ ] /api/billing/webhook downgrades to starter on subscription.deleted
- [ ] /api/billing/webhook returns 200 for unhandled events

## Unit Tests (Automated)
- [ ] canUseFeature() — starter can use ai_pricing, cannot use repeat_item_history
- [ ] canUseFeature() — standard can use repeat_item_history, cannot use cross_customer_pricing
- [ ] canUseFeature() — pro can use all features
- [ ] getUpgradeMessage() — returns correct tier and price
- [ ] TIER_CONFIGS — starter has 50 AI limit, standard/pro unlimited
- [ ] FEATURE_REQUIRED_TIER — maps all features to correct tiers

## Mobile
- [ ] Pricing cards stack vertically on mobile
- [ ] Usage meter readable on mobile
- [ ] UpgradePrompt renders correctly on mobile
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: 13 API tests (checkout, portal, webhook) + 15 unit tests (feature gates, tier configs)
- **Manual**: Full billing flow, feature gating, usage tracking
