# Help Widget Rebuild

## Fix 1 — Mobile Viewport
- Added `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">` to root layout
- Prevents pinch-to-zoom requirement on first mobile load
- RESOLVED

## Fix 2 — Help Widget Rebuild

### Structure Changes
- AI search bar moved to TOP as primary interaction with "Ask anything..." placeholder
- Quick links below search bar, compact and scannable
- Header shows tier badge: "Help · Solo Pricer" or "Help · Starter"

### Tier-Aware Quick Links
- **Solo**: lookups, save to inventory, Solo Pricer features, buy lookups, upgrade, photo feature, eBay comps, AI accuracy, change password
- **Starter+**: add consignor, pricing, 60-day lifecycle, AI pricing, eBay comps, override price, invite staff, split percentages, tier features

### Page-Aware Ordering
- `/dashboard/pricing` → Pricing Help section shown first
- `/dashboard/consignors` → Getting Started section shown first
- `/dashboard/inventory` → Getting Started section shown first
- `/dashboard/payouts` → Account & Settings section shown first
- Other pages → default section order

### Caching (Client + Server)
- **Client-side**: `Map<string, {answer, timestamp}>` in HelpWidget component, 24h TTL
- **Server-side**: Same pattern in `/api/help/search` route, 24h TTL
- Cache key = `question.toLowerCase().trim()`
- Duplicate questions return instantly from cache without API call

### Knowledge Base Updates
- Added Solo-specific content: lookups, personal inventory, Solo vs Starter comparison, bonus lookups, photo identification
- Added tier comparison info: Solo $9, Starter $49, Standard $79, Pro $129 with feature highlights
- Added password reset instructions
- All content used as system context for Claude AI help search

### Visual
- Search bar: full width, rounded-xl, prominent with search icon
- "Powered by AI" label under AI responses
- Quick links: compact text (13px), minimal padding
- Tier badge in header
