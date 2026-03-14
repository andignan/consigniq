# AI Pricing Engine Test Plan

## Scope
eBay comps via SerpApi, Claude AI pricing suggestions, photo identification, category-aware pricing.

## Happy Path — Comps Only
1. Navigate to `/dashboard/inventory/[id]/price` or `/dashboard/pricing`
2. Enter item name, category, condition
3. Click "eBay Comps Only"
4. Verify comps load with title, price, thumbnail
5. Verify "Get AI Suggestion" button appears after comps load

## Happy Path — Full AI Pricing
1. Enter item details + optional photo
2. Click "Full AI Pricing"
3. Verify AI returns price, low, high, reasoning
4. Verify price range is displayed visually
5. Override price manually if needed
6. Apply price — verify item status changes to "priced"

## Edge Cases
- [ ] No SERPAPI_KEY set — returns empty comps gracefully with `source: 'none'`
- [ ] No ANTHROPIC_API_KEY set — returns 500 with clear error
- [ ] SerpApi returns 0 results — AI prices without comps using knowledge
- [ ] AI returns invalid JSON — error is caught and displayed
- [ ] AI returns unexpected shape (missing fields) — validation catches it
- [ ] Photo upload with base64 encoding works for AI vision
- [ ] Item with unusual category falls back to "Other" config
- [ ] Very long item names don't break SerpApi query

## Category Config
- [ ] All 12 categories have valid `searchTerms()`, `priceGuidance`, `typicalMargin`
- [ ] Unknown category falls back to "Other"
- [ ] Search terms include category-specific keywords (e.g., "furniture", "used", "authentic")

## API Tests (Automated)
- [ ] POST `/api/pricing/comps` returns 400 without name
- [ ] POST `/api/pricing/comps` returns empty comps without API key
- [ ] POST `/api/pricing/suggest` returns 400 without required fields
- [ ] POST `/api/pricing/suggest` returns 500 without API key
- [ ] POST `/api/pricing/identify` returns 400 without photo
- [ ] `getCategoryConfig()` returns config for all 12 categories
- [ ] `getCategoryConfig()` falls back to Other for unknown categories

## Mobile
- [ ] Pricing page layout works on mobile
- [ ] Photo capture from mobile camera works
- [ ] Comp results are scrollable on small screens

## Current Status
- **Automated**: API validation tests, category config unit tests
- **Manual**: Requires API keys for full end-to-end pricing flow
