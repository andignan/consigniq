# Solo Tier UI Fixes — Round 2

## Fix 1 — Email placeholder
- Changed login email placeholder from "you@yourshop.com" to "Enter your email"
- Solo users are individual resellers, not shop owners
- RESOLVED

## Fix 2 — Progress bar minimum width
- Changed from `2%` CSS to `max(8px, ${pct}%)` so bar is always visible as a clear bar, not a dot
- Applied to both SoloDashboard usage meter and Settings billing tab usage meter
- RESOLVED

## Fix 3 — Help widget mobile overlap
- Added `pb-20 md:pb-0` to dashboard layout `<main>` element
- 80px bottom padding on mobile ensures content never sits behind the floating help widget
- Removed per-page `pb-24` from pricing page (now handled globally)
- RESOLVED

## Fix 4 — AI pricing prompt for Solo tier
- Detect tier in `/api/pricing/suggest` route
- Solo prompt: "resale pricing expert", prices for eBay/Poshmark/Marketplace
- Starter+ prompt: "consignment shop pricing expert", prices for brick-and-mortar store
- Reasoning text now uses appropriate language for each tier
- RESOLVED
