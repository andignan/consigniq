# Label Printing (PDF) Test Plan

## Scope
PDF label generation for inventory items — single item from pricing page, bulk from inventory list. Two label sizes: 2.25" x 1.25" (jewelry/price tag) and 4" x 2" (shipping label).

## Single Item Label (Pricing Page)

### Happy Path
1. Navigate to /dashboard/inventory → click Price on a pending item
2. Price the item with AI or manual price → apply price
3. Verify "Print Label" button appears in header (next to Back)
4. Verify label size dropdown defaults to 2.25" x 1.25"
5. Click "Print Label" → verify PDF opens in new tab
6. Verify PDF label contains:
   - Item name (up to 2 lines)
   - Category and condition
   - Price (effective_price shown)
   - Consignor name (first name + last initial only, e.g. "Sarah M.")
   - Location name
   - Item ID (last 6 chars of UUID)
   - "ConsignIQ" branding at bottom
7. Change size to 4" x 2" → click Print Label → verify larger PDF label
8. Verify loading spinner during generation

### Edge Cases
- [ ] Print button only visible when item has a price (priced status or price != null)
- [ ] Print button not visible during loading/error states
- [ ] Long item names truncate to 2 lines max
- [ ] Markdown items: original price shown struck through, effective price shown prominently
- [ ] Items with no consignor still generate valid label
- [ ] Items with no location still generate valid label
- [ ] Button disabled during PDF generation

## Bulk Label Printing (Inventory Page)

### Happy Path
1. Navigate to /dashboard/inventory
2. Verify checkboxes appear on each item card
3. Verify "Select all" checkbox at top of list
4. Check 3 items → verify bulk action bar appears with "3 selected"
5. Verify label size dropdown in bulk action bar
6. Click "Print Labels" → verify PDF with 3 labels opens in new tab
7. Click "Clear" → verify selection cleared and bulk bar disappears
8. Click "Select all" → verify all visible items selected
9. Click "Select all" again → verify all deselected

### Edge Cases
- [ ] Selected items get highlighted border (indigo)
- [ ] Bulk action bar disappears when 0 items selected
- [ ] Single item print button (printer icon) appears on priced items
- [ ] Checking/unchecking individual items updates the count
- [ ] Filters don't clear selection (selection persists across filter changes)
- [ ] Select all only selects currently visible items
- [ ] Large batch (50+ items) generates without timeout

## Label Content

### Content Verification
- [ ] Item name: truncated to 2 lines maximum
- [ ] Category: displayed as-is
- [ ] Condition: "like_new" → "Like New", "very_good" → "Very Good", others capitalized
- [ ] Price: uses effective_price when markdown > 0
- [ ] Markdown items: original price struck through, effective price shown
- [ ] Full-price items: single price displayed
- [ ] Consignor: "Sarah Miller" → "Sarah M." (first name + last initial)
- [ ] Consignor: single-name consignor → just the name (no initial)
- [ ] Location: full location name
- [ ] Item ID: last 6 chars of UUID, uppercase
- [ ] ConsignIQ branding: small text at bottom-right

### Label Sizing
- [ ] 2.25" x 1.25" (162 x 90 points) — content fits without overflow
- [ ] 4" x 2" (288 x 144 points) — larger text, more spacing
- [ ] PDF prints correctly on standard printers
- [ ] Labels can be cut apart from printed page

## API Tests (Automated)
- [ ] Returns 401 for unauthenticated user
- [ ] Returns 400 for empty item_ids array
- [ ] Returns 400 for missing item_ids
- [ ] Returns 404 for items from another account
- [ ] Returns PDF content-type for valid request
- [ ] Defaults to 2x1 size for invalid size value
- [ ] Generates labels for multiple items (one page per item)
- [ ] Scopes items query by account_id from session

## Mobile
- [ ] Checkboxes visible and tappable on mobile
- [ ] Bulk action bar wraps properly on narrow screens
- [ ] Print Label button visible on pricing page mobile
- [ ] Label size dropdown usable on mobile
- [ ] PDF opens in new browser tab on mobile
- [ ] All fetch calls include `credentials: 'include'`

## Current Status
- **Automated**: 8 API tests for `/api/labels/generate`
- **Manual**: Full UI workflow verification required for single/bulk printing, label content, sizing
