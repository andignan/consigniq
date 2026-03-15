# Manual Test Plan — Help Widget Rebuild

## Viewport
1. Open app on mobile Safari/Chrome → app fits screen without pinch-to-zoom
2. No horizontal scrollbar on any page

## Tier-Aware Quick Links
1. Log in as solo user → help widget shows: "How do lookups work?", "How do I save an item?", "How do I buy more lookups?"
2. No consignor-related questions visible for solo user
3. Log in as starter+ user → help widget shows: "How do I add a consignor?", "What happens at 60 days?", "How do I invite staff?"
4. Header shows tier badge (e.g., "Help · Solo Pricer" or "Help · Starter")

## Page-Aware Ordering
1. Navigate to /dashboard/pricing → "Pricing Help" section appears first
2. Navigate to /dashboard/consignors → "Getting Started" section appears first
3. Navigate to /dashboard → default section order

## AI Search
1. Type a question → hit Enter → AI answer appears in indigo box
2. "Powered by AI" label visible below answer
3. Search bar at top of widget, placeholder "Ask anything..."

## Caching
1. Ask "How do lookups work?" → get AI answer
2. Ask the same question again → answer appears instantly (no loading spinner)
3. Ask with different casing → still cached ("HOW DO LOOKUPS WORK?" = cache hit)

## Knowledge Base
1. Solo user asks "How many lookups do I get?" → answer mentions 200/month, resets monthly
2. Solo user asks "How do I save an item?" → answer mentions Price Lookup → Save to My Inventory
3. Starter user asks "How do I add a consignor?" → answer mentions Consignors sidebar → New Consignor
