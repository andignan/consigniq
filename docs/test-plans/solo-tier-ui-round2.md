# Manual Test Plan — Solo Tier UI Fixes Round 2

## Fix 1 — Login Placeholder
1. Navigate to /auth/login → email field placeholder reads "Enter your email"

## Fix 2 — Progress Bar
1. Log in as solo user with 0 lookups used → progress bar visible as thin colored bar (not invisible)
2. Settings billing tab → same progress bar visibility
3. At 50% usage → bar shows roughly half width
4. At 100% usage → bar fills full width

## Fix 3 — Help Widget Mobile
1. On mobile: scroll to bottom of any dashboard page → content not hidden behind blue help widget
2. Buttons and CTAs at page bottom are fully tappable
3. On desktop: no extra bottom padding (md:pb-0)

## Fix 4 — AI Pricing Language
1. Log in as solo user → price an item with AI
2. Reasoning should say "resale" not "consignment"
3. Should reference eBay/marketplace pricing, not "10-20% below eBay for consignment"
4. Log in as starter+ user → reasoning should mention "consignment store" pricing
