# Solo Tier UI Fixes

## Dashboard
1. **Sidebar upgrade CTA removed** — redundant with dashboard card CTA. RESOLVED.
2. **$49/mo standardized** — already consistent, no changes needed. RESOLVED.
3. **Progress bar min width** — 2% minimum so bar is always visible. RESOLVED.
4. **Welcome back message** — "Welcome back, [first name]!" using first word of full_name. RESOLVED.

## Price Lookup
5. **Solo subtitle** — "Price items and save to your inventory" for solo users. RESOLVED.
6. **Disabled tooltip** — "Enter an item name to get AI pricing" on hover. RESOLVED.
7. **eBay comps mobile** — error handling improved; root cause is SerpApi timeout on mobile networks, not a code bug. RESOLVED.
8. **Clear button mobile overlap** — added pb-24 bottom padding to clear help widget. RESOLVED.
9. **Save to My Inventory** — button appears after AI pricing for solo users, saves item with no consignor_id. RESOLVED.
10. **Price Another Item** — secondary CTA below comps section, clears form and results. RESOLVED.

## My Inventory
11. **Consignor filter hidden** — "All Consignors" dropdown hidden for solo users. RESOLVED.
12. **Solo status tabs** — All / Priced / Sold / Archived (no Pending/Donated). RESOLVED.
13. **Solo empty state** — "No items yet" heading, descriptive text, "Price an Item" CTA. RESOLVED.
14. **Page title** — "My Inventory" for solo, "Inventory" for others. RESOLVED.

## Settings
15. **Editable name** — Full Name field is now an editable input with Save button. New API endpoint: `PATCH /api/settings/profile`. RESOLVED.

## Auth / Shared
16. **Change Password inline** — replaced alert() with inline success message, auto-dismisses after 5 seconds. RESOLVED.
17. **Login subtitle** — "AI-Powered Pricing & Inventory". RESOLVED.
18. **Login footer** — "ConsignIQ · v1.0" (removed "Mokena, IL"). RESOLVED.

## Deferred
19. Stripe sandbox name — manual Stripe dashboard change, not code.
23. Sign Up link — deferred to self-service signup feature.
