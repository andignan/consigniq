# Manual Test Plan — UpgradeCard Component

## Prerequisites
- Running dev server (`npm run dev`)
- Test accounts at solo, starter, standard, and pro tiers

## Tests

### 1. Solo Dashboard
- [ ] Log in as solo user
- [ ] Dashboard shows upgrade card with "Running a consignment shop?" headline
- [ ] Card shows description text, $49/mo price, 4 features
- [ ] Button is outline style (teal border, teal text, not filled)
- [ ] Clicking button navigates to `/dashboard/settings?tab=account`

### 2. Solo Settings — Billing Tab
- [ ] Navigate to Settings (solo user)
- [ ] Billing section shows UpgradeCard with "Upgrade to Starter" headline
- [ ] Price shows $49/mo
- [ ] Button is outline style
- [ ] Clicking button initiates Stripe checkout for starter tier
- [ ] Loading spinner appears in button while checkout processes

### 3. Starter Settings — Billing Tab
- [ ] Log in as starter user, go to Settings → Account tab
- [ ] Two upgrade cards shown side by side (Standard + Pro)
- [ ] Standard card: $79/mo, 4 features, outline button
- [ ] Pro card: $129/mo, 5 features, outline button
- [ ] Clicking Standard button → Stripe checkout for standard
- [ ] Clicking Pro button → Stripe checkout for pro

### 4. Standard Settings — Billing Tab
- [ ] Log in as standard user, go to Settings → Account tab
- [ ] Single Pro upgrade card shown
- [ ] Price shows $129/mo, 5 features
- [ ] Clicking button → Stripe checkout for pro

### 5. Pro Settings — Billing Tab
- [ ] Log in as pro user, go to Settings → Account tab
- [ ] No upgrade cards shown (already at highest tier)

### 6. UpgradePrompt (Feature Lock)
- [ ] As starter user, go to pricing page → "Priced Before" panel shows UpgradePrompt
- [ ] Button is outline style (teal border, not filled)
- [ ] Links to settings billing section

### 7. Config Consistency
- [ ] Change a price in `TIER_CONFIGS` → verify all cards update
- [ ] Change a feature in `UPGRADE_CARD_CONFIG` → verify all instances update

### 8. Responsive
- [ ] Solo dashboard card renders full-width on mobile
- [ ] Starter billing: cards stack on mobile, side-by-side on desktop (md+)
